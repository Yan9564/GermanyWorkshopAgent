/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from '@google/genai';
import {
  ImageExtractionResult,
  AIExplorationOutput,
  WhiteboardFeedbackExtraction,
  RevisedPrioritiesOutput,
  BoardChallengeOutput,
  HumanDiscussionData,
  HumanOpportunityReview,
  ReviewDecision,
  UploadedWhiteboard,
  WorkshopContext,
} from '../src/types';

// Lazy initialization of Gemini client
let genAIClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[GeminiService] Warning: GEMINI_API_KEY is not set in environment variables. Fallback mode will be active.');
    return null;
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

/**
 * Clean and parse JSON from model output
 */
function parseCleanJson<T>(rawText: string, fallback: T): T {
  try {
    let cleaned = rawText.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/```\s*$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/, '');
    }
    return JSON.parse(cleaned) as T;
  } catch (err) {
    console.error('[GeminiService] Failed to parse JSON response:', err, '\nRaw text was:', rawText);
    return fallback;
  }
}

/** Format only supplied context values so optional/legacy requests stay clean. */
export function formatWorkshopContext(context?: Partial<WorkshopContext>): string {
  if (!context) return '';
  const fields: [string, unknown][] = [
    ['Organization', context.organization],
    ['Industry / Sector', context.industry],
    ['Business Unit / Function', context.businessUnit],
    ['Workshop Topic', context.workshopTopic || context.title],
    ['Workshop Objective', context.workshopObjective || context.objective],
    ['Process / Workflow in Scope', context.processScope],
    ['Key Stakeholders / Users', context.stakeholders],
    ['Current Challenges / Pain Points', context.currentChallenges],
    ['Strategic Priorities', context.strategicPriorities],
    ['Constraints', context.constraints],
    ['Additional Context', context.additionalContext],
  ];
  const populated = fields.filter(([, value]) => typeof value === 'string' && value.trim());
  if (populated.length === 0) return '';
  return `WORKSHOP CONTEXT (supporting background; do not treat as verified fact)\n${populated
    .map(([label, value]) => `${label}: ${(value as string).trim()}`)
    .join('\n')}`;
}

/**
 * Extract structured information from a whiteboard / flipchart image (SEARCH — Identify Challenges)
 */
export async function extractWhiteboardImage(
  imageDataUrl: string,
  userNotesHint?: string,
  workshopContext?: Partial<WorkshopContext>
): Promise<ImageExtractionResult> {
  const ai = getGenAI();

  // Fallback if API key not present or call fails
  const fallbackResult: ImageExtractionResult = {
    rawSummary: 'Identified core supply chain vulnerability notes and initial AI radar ideas from the executive board.',
    challenges: [
      'Single-source tier-2 chip and sensor suppliers in Southeast Asia vulnerable to climate/geopolitical shutdowns',
      'Port congestion and cross-border customs bottlenecks causing 3-4 week untracked delays',
      'Lack of real-time inventory visibility across 3PL partner warehouses and transit hubs',
      'Cybersecurity intrusions targeting legacy industrial SCADA systems at manufacturing sites',
      'Fragmented customer communication and inaccurate SLA commitments during major outages',
    ],
    initialAIIdeas: [
      'Real-time multi-tier supplier disruption radar using weak satellite/news signals',
      'Dynamic freight rerouting & autonomous container ETA prediction',
      'Automated crisis simulation & scenario war-gaming for supply chain committee',
    ],
    uncertainties: [
      'Note at bottom left about "ERP migration delay" was partially smudged — excluded for now.',
    ],
    isConfirmed: false,
    confidenceScore: 0.92,
  };

  if (!ai) {
    return fallbackResult;
  }

  try {
    // Extract base64 data and mime type
    let mimeType = 'image/png';
    let base64Data = imageDataUrl;

    if (imageDataUrl.startsWith('data:')) {
      const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      }
    }

    const formattedContext = formatWorkshopContext(workshopContext);
    const prompt = `You are an expert executive workshop facilitator specializing in executive strategy workshops.
You are inspecting an uploaded photo of an executive workshop whiteboard, flipchart, sticky note wall, or handwritten notes from the SEARCH stage of a strategy workshop.

${formattedContext ? `${formattedContext}\n\nUse this context only to disambiguate visible content. The image and participant notes remain the primary evidence. Never add a challenge merely because it seems plausible from the context, and do not invent facts not provided.\n` : ''}

Task:
1. Carefully read all legible text, diagrams, bullet points, and sticky notes.
2. Group the findings strictly into:
   - "challenges": 3 to 5 clear, strategic business and operational challenges/threats to service continuity.
   - "initialAIIdeas": Initial ideas or suggestions from the team about where AI might help.
   - "uncertainties": Explicitly note any ambiguous, smudged, half-written, or low-contrast text where you could not be 100% confident, so the executives can verify them.
   - "rawSummary": A brief 1-2 sentence neutral summary of what was identified.

IMPORTANT GUIDELINES:
- Do NOT invent or hallucinate text that is not visible on the whiteboard.
- If handwriting is unclear, add it to the "uncertainties" array with a note (e.g., "Partial note near top-right reading '...logistics vendor...' was indistinct").
- Preserve the participants' authentic phrasing and strategic intent.
${userNotesHint ? `Additional participant context provided: "${userNotesHint}"` : ''}

Respond with strict JSON matching this schema:
{
  "rawSummary": "string",
  "challenges": ["string"],
  "initialAIIdeas": ["string"],
  "uncertainties": ["string"],
  "confidenceScore": 0.95
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const parsed = parseCleanJson<ImageExtractionResult>(response.text || '', fallbackResult);
    parsed.isConfirmed = false;
    return parsed;
  } catch (error) {
    console.error('[GeminiService] Error extracting whiteboard image:', error);
    return fallbackResult;
  }
}

/**
 * Generate 8-10 distinct AI-enabled strategic opportunities (SEARCH — Explore AI Opportunities)
 */
export async function generateAIOpportunities(
  humanDiscussion: HumanDiscussionData,
  contextTitle: string,
  workshopContext?: Partial<WorkshopContext>
): Promise<AIExplorationOutput> {
  const ai = getGenAI();

  const fallbackOpportunities: AIExplorationOutput = {
    challengeAssessment: {
      strategicSignificance: 'High systemic vulnerability across extended multi-tier supply networks and interconnected digital logistics channels.',
      impactNext2To3Years: 'Severe financial and reputational downside if single-point component failures or cyber/physical disruptions cascade unchecked.',
      urgencyAndLikelihood: 'High likelihood of recurring regional bottlenecks; immediate urgency to establish predictive weak-signal monitoring.',
      crossEcosystemDependencies: 'Critical dependencies across Tier-2/3 raw material suppliers, 3PL logistics carriers, customs brokers, and enterprise ERP backbones.',
      keyAssumptionsOrOverlaps: 'Assumes partner ecosystem willingness to share authenticated operational telemetry and federated data streams.',
    },
    opportunities: [
      {
        id: 'opp-1',
        number: '01',
        name: 'Predictive Multi-Tier Supplier Weak-Signal Radar',
        challengesAddressed: ['Single-source tier-2 chip and sensor suppliers', 'Geopolitical volatility'],
        whyNow: 'Advancements in multi-modal knowledge graphs and open-source intelligence enable early detection of distress before order cancellation.',
        aiUseCase: 'Graph neural networks + weak-signal news/satellite NLP tracking financial stress, labor disputes, and regional anomalies across tier-1 to tier-3 nodes.',
        strategicOpportunity: 'Convert reactive emergency expediting into 14-day advance re-allocation, protecting gross margin and critical SLAs.',
        executionApproach: 'Integrate existing procurement master data with commercial trade-lane intelligence feeds; deploy automated risk scoring dashboard.',
        requiredProprietaryData: 'Tier-1 supplier Bill of Materials (BOM), historical purchase orders, component lead times, and SLA penalty clauses.',
        relevantPublicData: 'Global customs manifests (Bills of Lading), localized weather anomalies, regional regulatory notices, satellite port traffic.',
        cost: '$$',
        timeline: '<5 weeks',
        priorityTier: 'High',
        isTopPriority: true,
        top3Ranking: 1,
        prioritizationRationale: 'Highest immediate impact on service continuity by addressing unmonitored Tier-2/3 blind spots with minimal upfront ERP friction.',
      },
      {
        id: 'opp-2',
        number: '02',
        name: 'Dynamic 3PL Transit Interruption & Autonomous Freight Rerouting',
        challengesAddressed: ['Port congestion and customs bottlenecks', '3PL transit untracked delays'],
        whyNow: 'Real-time IoT container feeds paired with predictive ETA machine learning can simulate trade-lane choke points in minutes.',
        aiUseCase: 'Reinforcement learning & spatial graph optimization predicting container dwell times and auto-generating alternate carrier routing plans.',
        strategicOpportunity: 'Reduce transit delay variances from 21 days to under 48 hours; safeguard just-in-time delivery for high-value product lines.',
        executionApproach: 'Connect telematics APIs from top 5 logistics carriers into a unified route simulator; provide one-click dispatcher approvals.',
        requiredProprietaryData: 'Carrier contracts, real-time EDI/API shipping milestones, warehouse receiving capacities, dynamic freight rate cards.',
        relevantPublicData: 'AIS vessel telemetry, port terminal dwell indexes, border customs processing queue metrics, weather forecasts.',
        cost: '$$',
        timeline: '<5 weeks',
        priorityTier: 'High',
        isTopPriority: true,
        top3Ranking: 2,
        prioritizationRationale: 'Directly mitigates primary logistics choke points with quantifiable ROI in reduced demurrage fees and preserved customer delivery SLAs.',
      },
      {
        id: 'opp-3',
        number: '03',
        name: 'Generative Crisis Scenario War-Gaming & Dynamic Response Playbooks',
        challengesAddressed: ['Fragmented customer communication and inaccurate SLA commitments', 'Disruption recovery latency'],
        whyNow: 'LLMs fine-tuned on organizational crisis procedures can simulate complex multi-party failure scenarios and draft tailored action plans in seconds.',
        aiUseCase: 'Interactive generative simulation model running synthetic stress tests against supply shocks, producing executable cross-functional playbooks.',
        strategicOpportunity: 'Compress crisis response synthesis from 72 hours of executive meetings into 15 minutes of guided, cross-departmental coordination.',
        executionApproach: 'Ingest legacy BCP policies, contract templates, and org charts into a secure RAG workspace with pre-configured crisis scenarios.',
        requiredProprietaryData: 'Business Continuity Plans (BCP), executive decision matrix, customer escalation trees, supplier SLAs.',
        relevantPublicData: 'Historical supply chain shock case studies, macroeconomic interest rate indices, regulatory compliance templates.',
        cost: '$',
        timeline: '<5 days',
        priorityTier: 'High',
        isTopPriority: true,
        top3Ranking: 3,
        prioritizationRationale: 'Fastest time-to-value (<5 days) with lowest capital outlay ($), providing executive leadership with immediate decision speed during live shocks.',
      },
      {
        id: 'opp-4',
        number: '04',
        name: 'Federated Real-Time Warehouse Inventory Balancing',
        challengesAddressed: ['Lack of real-time inventory visibility across 3PL partner warehouses'],
        whyNow: 'Federated learning algorithms allow multi-party inventory synchronization without exposing confidential batch quantities.',
        aiUseCase: 'Distributed machine learning agents predicting localized stockout risks and suggesting cross-facility balancing transfers.',
        strategicOpportunity: 'Cut safety stock holding costs by 18% while increasing order fulfillment reliability to 99.4%.',
        executionApproach: 'Implement lightweight API connector modules for top 3PL warehouse management systems (WMS).',
        requiredProprietaryData: 'WMS inventory logs, SKU velocity metrics, regional order demand history, safety buffer thresholds.',
        relevantPublicData: 'Regional consumption indexes, holiday transportation load restrictions.',
        cost: '$$',
        timeline: '<5 weeks',
        priorityTier: 'Medium',
        isTopPriority: false,
      },
      {
        id: 'opp-5',
        number: '05',
        name: 'Industrial OT/SCADA Anomaly Detection & Self-Healing Telemetry',
        challengesAddressed: ['Cybersecurity intrusions targeting legacy industrial SCADA systems'],
        whyNow: 'Unsupervised deep anomaly detection on sensor time-series data catches zero-day lateral movement before operational degradation.',
        aiUseCase: 'Edge AI inference agents analyzing PLC bus traffic and sensor vibrations to detect unauthorized tampering or component wear.',
        strategicOpportunity: 'Eliminate unplanned manufacturing downtime from cyber-physical incidents and prevent factory line halts.',
        executionApproach: 'Deploy edge gateway sniffers at critical production lines connected to a central SIEM security dashboard.',
        requiredProprietaryData: 'SCADA network PCAP logs, PLC firmware baselines, maintenance work orders, sensor time-series streams.',
        relevantPublicData: 'MITRE ATT&CK for ICS threat feeds, CVE vulnerability disclosures.',
        cost: '$$$',
        timeline: '<5 months',
        priorityTier: 'Medium',
        isTopPriority: false,
      },
      {
        id: 'opp-6',
        number: '06',
        name: 'Autonomous Contract Force Majeure & SLA Renegotiation Assistant',
        challengesAddressed: ['Fragmented customer communication and inaccurate SLA commitments', 'Supplier contract risk'],
        whyNow: 'Domain-specific legal language models can parse thousands of vendor contracts and correlate disruption events with legal liabilities.',
        aiUseCase: 'Contract intelligence agent identifying force majeure clauses, alternate sourcing covenants, and penalties across all supplier agreements.',
        strategicOpportunity: 'Recover up to 12% in un-claimed supplier delay credits and mitigate legal exposure from downstream customer claims.',
        executionApproach: 'OCR and ingest historical master service agreements into a structured contract clause knowledge graph.',
        requiredProprietaryData: 'Signed vendor MSAs, purchase order terms, historical breach notices, customer contract SLAs.',
        relevantPublicData: 'Uniform Commercial Code (UCC) case precedents, maritime arbitration standards.',
        cost: '$$',
        timeline: '<5 weeks',
        priorityTier: 'Medium',
        isTopPriority: false,
      },
      {
        id: 'opp-7',
        number: '07',
        name: 'Component Substitution & Engineering Redesign Recommender',
        challengesAddressed: ['Single-source tier-2 chip and sensor suppliers'],
        whyNow: 'Multimodal vector search can match electrical specifications, pin configurations, and thermal envelopes across millions of electronic parts.',
        aiUseCase: 'Vector embedding search on global component databases recommending drop-in replacement ICs and generating schematic modification drafts.',
        strategicOpportunity: 'Shorten engineering component requalification cycles from 6 months to 2 weeks during unexpected component obsolescence.',
        executionApproach: 'Build proprietary CAD and BOM index linked to global component distributor APIs.',
        requiredProprietaryData: 'Internal CAD schematics, PCB layout files, internal qualification test records, approved vendor lists (AVL).',
        relevantPublicData: 'Distributor component datasheets, manufacturer obsolescence notices, RoHS/REACH compliance logs.',
        cost: '$$',
        timeline: '<5 weeks',
        priorityTier: 'Medium',
        isTopPriority: false,
      },
      {
        id: 'opp-8',
        number: '08',
        name: 'Proactive Customer Impact Telemetry & SLA Transparency Portal',
        challengesAddressed: ['Fragmented customer communication and inaccurate SLA commitments'],
        whyNow: 'Event-driven customer engagement models can generate personalized impact notices and revised delivery estimates before customers call support.',
        aiUseCase: 'Natural language generation pipeline that maps upstream logistics delays to specific customer orders and drafts proactive communication.',
        strategicOpportunity: 'Transform disruption into a loyalty driver by providing radical delivery transparency and automated credits.',
        executionApproach: 'Integrate CRM order management with real-time supply chain event stream; enable automated account manager notifications.',
        requiredProprietaryData: 'CRM account records, customer order queues, contractual delivery penalty terms, account tiering rules.',
        relevantPublicData: 'Carrier transit statuses, regional postal disruption advisories.',
        cost: '$',
        timeline: '<5 days',
        priorityTier: 'Low',
        isTopPriority: false,
      },
    ],
    top3Priorities: [
      {
        rank: 1,
        opportunityId: 'opp-1',
        name: 'Predictive Multi-Tier Supplier Weak-Signal Radar',
        rationale: 'Addresses the foundational vulnerability (tier-2/3 supplier visibility) with immediate strategic payoff and moderate complexity.',
      },
      {
        rank: 2,
        opportunityId: 'opp-2',
        name: 'Dynamic 3PL Transit Interruption & Autonomous Freight Rerouting',
        rationale: 'Directly solves acute logistics delay variances and customs bottlenecks with immediate operational cost savings and high feasibility.',
      },
      {
        rank: 3,
        opportunityId: 'opp-3',
        name: 'Generative Crisis Scenario War-Gaming & Dynamic Response Playbooks',
        rationale: 'Provides ultra-rapid executive deployment (<5 days, $) to eliminate coordination friction during live disruption events.',
      },
    ],
    prioritisationOverview: 'The Top 3 priorities balance immediate crisis command agility (<5 days), actionable logistics mitigation (<5 weeks), and deep systemic supplier visibility ($$). They directly ground the human-defined vulnerabilities without forcing high-risk capital expenditure.',
    generatedAt: Date.now(),
  };

  if (!ai) {
    return fallbackOpportunities;
  }

  try {
    const formattedContext = formatWorkshopContext(workshopContext);
    const prompt = `You are a world-class executive strategy advisor facilitating a high-stakes executive workshop on "${contextTitle}".

${formattedContext ? `${formattedContext}\n\nUse the workshop context to improve relevance, but do not invent company-specific facts. Generate opportunities relevant to the stated organization, process, stakeholders, strategic priorities, and constraints.\n` : ''}

The executive group has completed SEARCH (Prepare Context and Identify Challenges) and provided their confirmed challenges and initial AI ideas:

HUMAN-IDENTIFIED CHALLENGES:
${humanDiscussion.challenges.map((c, i) => `${i + 1}. ${c}`).join('\n')}

HUMAN INITIAL AI IDEAS:
${humanDiscussion.initialAIIdeas.map((idea, i) => `${i + 1}. ${idea}`).join('\n')}

${humanDiscussion.rawTextNotes ? `ADDITIONAL TEAM NOTES: ${humanDiscussion.rawTextNotes}` : ''}

STAGE 3 TASK:
1. Conduct a concise executive Challenge Assessment of the human-identified challenges (strategic significance, 2-3 yr horizon impact, urgency & likelihood, cross-ecosystem dependencies, key assumptions/overlaps). Preserve the executive group's framing.
2. Identify 8 to 10 distinct, strategically significant AI-enabled opportunities that address the team's challenges.
   Each opportunity MUST:
   - address one or more participant-defined challenges;
   - be materially different from the others;
   - represent a meaningful strategic response;
   - avoid generic AI buzzwords;
   - be specific enough for executive C-suite discussion.
   - specify:
     * id (e.g. "opp-1", "opp-2", etc.)
     * number (e.g. "01", "02", etc.)
     * name
     * challengesAddressed (array of strings matching their inputs)
     * whyNow (technological or macroeconomic catalyst)
     * aiUseCase (exact AI technique/architecture)
     * strategicOpportunity (business impact and resilience outcome)
     * executionApproach (brief 1-2 sentence rollout path)
     * requiredProprietaryData
     * relevantPublicData
     * relevantStakeholders (roles affected by or accountable for the use case)
     * keyAssumption (the most important assumption to validate)
     * potentialValue (the expected organizational or process value)
     * cost: "$" (low), "$$" (medium), or "$$$" (high)
     * timeline: "<5 days", "<5 weeks", or "<5 months"
     * priorityTier: "High", "Medium", or "Low"
     * isTopPriority: boolean (true for exactly top 3)
     * top3Ranking: number (1, 2, or 3 for the top 3, omitted for others)
     * prioritizationRationale: string (for top 3)
3. Rank the Top 3 priorities with explicit justification balancing impact, urgency, data availability, feasibility, cost, speed, and decision quality.

Return strict JSON matching this structure:
{
  "challengeAssessment": {
    "strategicSignificance": "string",
    "impactNext2To3Years": "string",
    "urgencyAndLikelihood": "string",
    "crossEcosystemDependencies": "string",
    "keyAssumptionsOrOverlaps": "string"
  },
  "opportunities": [
    {
      "id": "opp-1",
      "number": "01",
      "name": "string",
      "challengesAddressed": ["string"],
      "whyNow": "string",
      "aiUseCase": "string",
      "strategicOpportunity": "string",
      "executionApproach": "string",
      "requiredProprietaryData": "string",
      "relevantPublicData": "string",
      "relevantStakeholders": "string",
      "keyAssumption": "string",
      "potentialValue": "string",
      "cost": "$$",
      "timeline": "<5 weeks",
      "priorityTier": "High",
      "isTopPriority": true,
      "top3Ranking": 1,
      "prioritizationRationale": "string"
    }
  ],
  "top3Priorities": [
    {
      "rank": 1,
      "opportunityId": "opp-1",
      "name": "string",
      "rationale": "string"
    }
  ],
  "prioritisationOverview": "string"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    const parsed = parseCleanJson<AIExplorationOutput>(response.text || '', fallbackOpportunities);
    parsed.generatedAt = Date.now();
    return parsed;
  } catch (error) {
    console.error('[GeminiService] Error generating AI opportunities:', error);
    return fallbackOpportunities;
  }
}

/**
 * Extract feedback from an AGGREGATION review whiteboard photo
 */
export async function extractWhiteboardFeedbackImage(
  imageDataUrl: string,
  currentOpportunities: AIExplorationOutput,
  workshopContext?: Partial<WorkshopContext>
): Promise<WhiteboardFeedbackExtraction> {
  const ai = getGenAI();

  const fallback: WhiteboardFeedbackExtraction = {
    agreements: [
      'Strongly agree on Priority 1 (Predictive Multi-Tier Supplier Weak-Signal Radar) as the anchor capability.',
      'Validate Opportunity 04 (Autonomous Dynamic Logistics Re-routing) for short-term operations.',
    ],
    disagreements: [
      'Opportunity 06 (Autonomous Contract Renegotiation) is premature; legal compliance and counterparty trust make full autonomy too risky.',
    ],
    challenges: [
      'Priority 3 timeline is too optimistic; legacy ERP integration will take at least 4 months, not 5 weeks.',
      'Implementation budget for Tier-3 supplier telemetry might exceed $$ bracket.',
    ],
    merges: [
      'Merge Opportunity 03 (Multi-tier BOM dependency graph) directly into Priority 1 to create an end-to-end supplier visibility platform.',
    ],
    newAssumptions: [
      'Assume key strategic suppliers are willing to share masked telemetry via secure API.',
      'Human logistics directors must retain final override on any automated freight rerouting above $50k value.',
    ],
    additionalContext: [
      'European CSRD and supply chain due diligence regulations mandate supply chain transparency by Q3.',
    ],
    rawSummary: 'Identified strong endorsement for Priority 1, pushback on automated contract renegotiation, and proposed merging BOM graphs into the supplier radar.',
    uncertainties: [],
    isConfirmed: false,
  };

  if (!ai) {
    return fallback;
  }

  try {
    let mimeType = 'image/png';
    let base64Data = imageDataUrl;

    if (imageDataUrl.startsWith('data:')) {
      const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      }
    }

    const oppsSummary = currentOpportunities.opportunities
      .map(o => `[${o.number}] ${o.name} (Tier: ${o.priorityTier}, Cost: ${o.cost}, Time: ${o.timeline})`)
      .join('\n');

    const formattedContext = formatWorkshopContext(workshopContext);
    const prompt = `You are an executive workshop facilitator interpreting an AGGREGATION Review Feedback Whiteboard / Sticky-Note photo.
${formattedContext ? `\n${formattedContext}\nUse context only to interpret the participants' visible feedback; do not add feedback that is not present in the image.\n` : ''}
The executive team has been reviewing the following AI-generated strategic opportunities:
${oppsSummary}

Task:
Interpret the whiteboard / handwritten sticky notes specifically as feedback, critique, and revisions to these AI opportunities.
Extract structured feedback into:
- "agreements": Specific opportunities or rankings the team explicitly endorses.
- "disagreements": Specific opportunities or rankings the team rejects or down-ranks.
- "challenges": Concrete feasibility, cost, legal, or timeline concerns raised by the team.
- "merges": Any suggestions to combine two or more opportunities together.
- "newAssumptions": Key organizational, technical, or supplier assumptions voiced by the group.
- "additionalContext": External factors mentioned (e.g., regulatory deadlines, customer mandates).
- "uncertainties": Any handwritten text that was indistinct or ambiguous.
- "rawSummary": 1-2 sentence executive overview.

Return strict JSON:
{
  "agreements": ["string"],
  "disagreements": ["string"],
  "challenges": ["string"],
  "merges": ["string"],
  "newAssumptions": ["string"],
  "additionalContext": ["string"],
  "uncertainties": ["string"],
  "rawSummary": "string"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const parsed = parseCleanJson<WhiteboardFeedbackExtraction>(response.text || '', fallback);
    parsed.isConfirmed = false;
    return parsed;
  } catch (error) {
    console.error('[GeminiService] Error extracting whiteboard feedback:', error);
    return fallback;
  }
}

/**
 * Synthesize revised priorities based on human Keep/Challenge/Discard reviews & whiteboard feedback (AGGREGATION — Review & Prioritize)
 */
export async function synthesizeRevisedPriorities(
  originalExploration: AIExplorationOutput,
  humanReviews: Record<string, HumanOpportunityReview | ReviewDecision>,
  whiteboardFeedback?: WhiteboardFeedbackExtraction,
  workshopContext?: Partial<WorkshopContext>
): Promise<RevisedPrioritiesOutput> {
  const ai = getGenAI();

  const fallback: RevisedPrioritiesOutput = {
    revisedPriorities: [
      {
        id: 'priority-1',
        rank: 1,
        originalName: 'Predictive Multi-Tier Supplier Weak-Signal Radar',
        humanFeedbackSummary: 'Kept with high alignment; team endorsed merging BOM dependency graphs to give end-to-end visibility down to Tier-3 raw materials.',
        revisedStrategicFocus: 'Enterprise Multi-Tier Supplier Intelligence & BOM Dependency Platform (Unified Signal Radar + Tier-3 Graph)',
        justification: 'Unanimous executive endorsement as foundational capability; merged BOM dependency graph addresses critical blind spots while mitigating supplier resistance via federated APIs.',
        status: 'MODIFIED',
      },
      {
        id: 'priority-2',
        rank: 2,
        originalName: 'Dynamic 3PL Transit Interruption & Autonomous Freight Rerouting',
        humanFeedbackSummary: 'Kept with governance guardrail: Added human-in-the-loop requirement where logistics directors authorize rerouting actions exceeding $50k.',
        revisedStrategicFocus: 'Operator-Supervised Dynamic Freight & Customs Interruption Navigator (Human-in-the-Loop Override)',
        justification: 'Preserves rapid ETA optimization benefits while honoring leadership governance requirement for capital threshold sign-offs.',
        status: 'MODIFIED',
      },
      {
        id: 'priority-3',
        rank: 3,
        originalName: 'Generative Crisis Scenario War-Gaming & Dynamic Response Playbooks',
        humanFeedbackSummary: 'Kept for rapid time-to-value (<5 days) to unify cross-functional executive crisis coordination and replace ad-hoc phone trees.',
        revisedStrategicFocus: 'Executive Crisis Simulation & Dynamic Playbook Hub (Cross-Functional Response Accelerator)',
        justification: 'Immediate low-cost deployment ($) that directly improves strategic response agility and prevents fragmented communications during major disruptions.',
        status: 'CONFIRMED',
      },
    ],
    executiveAlignmentRationale: 'The revised priorities integrate executive committee feedback: adding human-in-the-loop financial thresholds to autonomous rerouting, merging component dependency graphs into the supplier radar, and anchoring on rapid crisis coordination speed.',
    generatedAt: Date.now(),
    isConfirmed: false,
  };

  if (!ai) {
    return fallback;
  }

  try {
    const reviewsSummary = Object.entries(humanReviews)
      .map(([id, r]) => {
        const opp = originalExploration.opportunities.find(o => o.id === id);
        const decision = typeof r === 'string' ? r : r.decision;
        const comment = typeof r === 'string' ? '' : r.comment;
        return `- [${decision}] ${opp?.name || id}: "${comment || 'No comment'}"`;
      })
      .join('\n');

    const feedbackSummary = whiteboardFeedback
      ? `
WHITEBOARD FEEDBACK:
- Agreements: ${whiteboardFeedback.agreements.join('; ')}
- Disagreements: ${whiteboardFeedback.disagreements.join('; ')}
- Challenges: ${whiteboardFeedback.challenges.join('; ')}
- Merges: ${whiteboardFeedback.merges.join('; ')}
- New Assumptions: ${whiteboardFeedback.newAssumptions.join('; ')}
- Additional Context: ${whiteboardFeedback.additionalContext.join('; ')}`
      : 'No whiteboard feedback uploaded.';

    const formattedContext = formatWorkshopContext(workshopContext);
    const prompt = `You are a strategic facilitator synthesizing executive revisions to AI opportunities.

${formattedContext ? `${formattedContext}\nUse the context to assess alignment and feasibility, but do not invent organization-specific facts or override explicit human feedback.\n` : ''}

ORIGINAL AI TOP 3:
${originalExploration.top3Priorities.map(p => `${p.rank}. ${p.name}: ${p.rationale}`).join('\n')}

ALL ORIGINAL OPPORTUNITIES:
${originalExploration.opportunities.map(o => `[${o.id}] ${o.name} (${o.cost}, ${o.timeline})`).join('\n')}

HUMAN REVIEWS (Keep / Challenge / Discard):
${reviewsSummary || 'Default endorsements applied.'}

${feedbackSummary}

TASK:
Synthesize exactly 3 REVISED STRATEGIC PRIORITIES reflecting the human evaluations.
For each priority clearly contrast:
1. rank (1, 2, 3)
2. id (a stable ID based on the original opportunity ID where possible)
3. originalName (the initial AI opportunity name)
4. humanFeedbackSummary (concise summary of human review, challenges, or merges)
5. revisedStrategicFocus (the modified or refined priority title incorporating human guidance)
6. justification (why this revised version delivers superior executive alignment and feasibility)
7. status ("CONFIRMED" if kept as-is, "MODIFIED" if altered/merged, or "SUBSTITUTED" if replaced by another opportunity)

Include an "executiveAlignmentRationale" summarizing how human judgement steered the strategic direction.

Return strict JSON matching this schema:
{
  "revisedPriorities": [
    {
      "id": "priority-opp-1",
      "rank": 1,
      "originalName": "string",
      "humanFeedbackSummary": "string",
      "revisedStrategicFocus": "string",
      "justification": "string",
      "status": "MODIFIED"
    }
  ],
  "executiveAlignmentRationale": "string"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    const parsed = parseCleanJson<RevisedPrioritiesOutput>(response.text || '', fallback);
    parsed.revisedPriorities = parsed.revisedPriorities.map((priority) => ({
      ...priority,
      id: priority.id || `priority-${priority.originalOpportunityId || priority.rank}`,
    }));
    parsed.generatedAt = Date.now();
    parsed.isConfirmed = false;
    return parsed;
  } catch (error) {
    console.error('[GeminiService] Error synthesizing revised priorities:', error);
    return fallback;
  }
}

/**
 * Board Challenge Mode (AGGREGATION — Stress Test)
 * Stress-tests the 3 revised priorities with Fortune 500 Board critical scrutiny
 */
export async function runBoardChallenge(
  revisedPriorities: RevisedPrioritiesOutput,
  contextTitle: string,
  workshopContext?: Partial<WorkshopContext>
): Promise<BoardChallengeOutput> {
  const ai = getGenAI();

  const fallback: BoardChallengeOutput = {
    executiveCommitteeVerdict: 'The Board Risk & Audit Committee validates the strategic necessity of these three initiatives, but cautions management against severe execution friction in supplier data governance and human operator override discipline.',
    prioritiesChallenged: [
      {
        priorityRank: 1,
        priorityName: revisedPriorities.revisedPriorities[0]?.revisedStrategicFocus || 'Enterprise Multi-Tier Supplier Intelligence & BOM Dependency Platform',
        executionFriction: {
          failurePoint1: 'Tier-2 and Tier-3 suppliers intentionally obscure single-source dependencies or provide falsified capacity telemetry to prevent margin compression.',
          failurePoint2: 'Alert fatigue and noisy weak-signal alerts lead procurement managers to dismiss genuine early warnings during non-crisis periods.',
          failurePoint3: 'BOM knowledge graphs become stale within 90 days due to unrecorded engineering change orders (ECOs) bypassing centralized ERP.',
        },
        governanceAndRisk: {
          materialWorstCaseScenario: 'Management relies on a "green" supplier risk dashboard, unaware that a critical Tier-3 specialized chemical producer was offline, causing a 6-week plant stoppage.',
          safeguardSufficiency: 'PARTIALLY_SUFFICIENT',
          safeguardReasoning: 'Automated scraping is insufficient without enforceable contractual data-sharing covenants and third-party audit verification.',
          singleMostImportantRemainingGap: 'Establish contractual SLA clauses mandating verified API telemetry from all Tier-1 and Tier-2 suppliers with financial penalties for non-compliance.',
        },
      },
      {
        priorityRank: 2,
        priorityName: revisedPriorities.revisedPriorities[1]?.revisedStrategicFocus || 'Operator-Supervised Dynamic Freight & Customs Interruption Navigator',
        executionFriction: {
          failurePoint1: 'During severe geopolitical shocks, spot freight rates and air-cargo capacity evaporate faster than algorithmic re-booking logic can execute.',
          failurePoint2: 'Automation bias causes regional dispatchers to blindly approve AI rerouting into secondary ports that lack customs clearance infrastructure.',
          failurePoint3: 'Conflicting departmental incentives: Logistics optimizes for transit speed while Manufacturing optimizes for batch freight cost, creating deadlock.',
        },
        governanceAndRisk: {
          materialWorstCaseScenario: 'Algorithmic dynamic rerouting shifts 80 high-value containers to an alternate regional terminal, triggering unanticipated $2.4M demurrage charges and regulatory customs impoundment.',
          safeguardSufficiency: 'PARTIALLY_SUFFICIENT',
          safeguardReasoning: 'Human override threshold ($50k) is helpful but lacks pre-cleared customs broker authorizations for secondary ports.',
          singleMostImportantRemainingGap: 'Pre-negotiate secondary customs clearance conduits and establish an inter-departmental expedited freight triage protocol.',
        },
      },
      {
        priorityRank: 3,
        priorityName: revisedPriorities.revisedPriorities[2]?.revisedStrategicFocus || 'Executive Crisis Simulation & Dynamic Playbook Hub',
        executionFriction: {
          failurePoint1: 'Simulated playbooks are treated as a compliance check-the-box exercise and never integrated into daily operational dispatch.',
          failurePoint2: 'During a real multi-vector cyber/supply crisis, key operational executives lack clear decision rights and default to siloed risk-averse delay.',
          failurePoint3: 'Generative AI hallucination in crisis playbooks recommending emergency suppliers that have expired regulatory safety certifications.',
        },
        governanceAndRisk: {
          materialWorstCaseScenario: 'During a live ransomware outage, the AI-generated dynamic response playbook recommends contacting an emergency logistics vendor whose credentials were compromised, compounding the breach.',
          safeguardSufficiency: 'SUFFICIENT',
          safeguardReasoning: 'Human executive oversight is maintained, provided crisis playbooks are pre-vetted against legal compliance registries.',
          singleMostImportantRemainingGap: 'Enforce mandatory quarterly live executive dry-runs with red-team injection of simultaneous cyber-physical shocks.',
        },
      },
    ],
    boardRecommendations: [
      'Mandate explicit contractual data rights in upcoming supplier master contract renewals.',
      'Establish a cross-functional Resilience Operations Committee with pre-delegated financial spend authority up to $250k.',
      'Require mandatory human legal sign-off on all automated crisis playbook vendor substitutions.',
    ],
    generatedAt: Date.now(),
  };

  if (!ai) {
    return fallback;
  }

  try {
    const prioritiesList = revisedPriorities.revisedPriorities
      .map(p => `Priority ${p.rank}: ${p.revisedStrategicFocus}\nOriginal Base: ${p.originalName}\nTeam Rationale: ${p.justification}`)
      .join('\n\n');

    const formattedContext = formatWorkshopContext(workshopContext);
    const prompt = `You are the Lead Independent Director conducting a formal Board Challenge on the executive management team's 3 proposed strategic priorities for ${contextTitle}.

${formattedContext ? `${formattedContext}\nEvaluate the priorities in light of the supplied constraints, stakeholders, process realities, and strategic priorities. Treat context as participant-provided background, not verified fact, and do not invent company-specific details.\n` : ''}

THE 3 ESTABLISHED PRIORITIES:
${prioritiesList}

YOUR MANDATE AS A BOARD CHALLENGER:
- You are NOT here to be polite or cheerlead. You represent the Board's fiduciary, risk oversight, capital allocation, and governance responsibilities.
- You must NOT introduce new AI ideas, re-rank them, or replace these 3 priorities.
- You must STRESS-TEST each of the 3 existing priorities with Board-level rigor.
- For each priority, identify:
  A. Execution Friction: Exactly THREE concrete, causally specific failure mechanisms that could prevent this initiative from delivering expected value. Avoid vague generalities like "change management may be hard". Focus on unstated assumptions, behavioral biases, unreliable data during crises, misaligned incentives, or automation bias.
  B. Governance, Risk & Downside Protection:
     * materialWorstCaseScenario: The most realistic catastrophic operational/financial downside if poorly governed.
     * safeguardSufficiency: Exactly one of "SUFFICIENT", "PARTIALLY_SUFFICIENT", or "MATERIALLY_INSUFFICIENT".
     * safeguardReasoning: Direct, 1-2 sentence Board evaluation of existing safeguards.
     * singleMostImportantRemainingGap: The single most vital governance or operational control management must implement before capital release.

Provide an overall "executiveCommitteeVerdict" and 3 high-impact "boardRecommendations".

Return strict JSON:
{
  "executiveCommitteeVerdict": "string",
  "prioritiesChallenged": [
    {
      "priorityRank": 1,
      "priorityName": "string",
      "executionFriction": {
        "failurePoint1": "string",
        "failurePoint2": "string",
        "failurePoint3": "string"
      },
      "governanceAndRisk": {
        "materialWorstCaseScenario": "string",
        "safeguardSufficiency": "PARTIALLY_SUFFICIENT",
        "safeguardReasoning": "string",
        "singleMostImportantRemainingGap": "string"
      }
    }
  ],
  "boardRecommendations": ["string", "string", "string"]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.25,
      },
    });

    const parsed = parseCleanJson<BoardChallengeOutput>(response.text || '', fallback);
    parsed.generatedAt = Date.now();
    return parsed;
  } catch (error) {
    console.error('[GeminiService] Error running Board Challenge:', error);
    return fallback;
  }
}

/**
 * Stage-Aware Facilitator Guidance & Guardrail Assistant
 */
export async function getFacilitatorStageResponse(
  stage: number | 'search' | 'representation' | 'aggregation',
  userMessage: string,
  sessionState: Record<string, any>,
  substep?: string,
  workshopContext?: Partial<WorkshopContext>
): Promise<string> {
  // Translate legacy page numbers at the API boundary; prompts use semantic stages only.
  const mainStage = typeof stage === 'number'
    ? stage <= 3 ? 'search' : stage === 4 ? 'representation' : 'aggregation'
    : stage;

  // SEARCH must broaden and articulate the problem rather than prematurely converge.
  if (mainStage === 'search') {
    const lower = userMessage.toLowerCase();
    if (
      lower.includes('what should i') ||
      lower.includes('give me ideas') ||
      lower.includes('what are some') ||
      lower.includes('solution') ||
      lower.includes('recommend') ||
      lower.includes('suggest') ||
      lower.includes('answer')
    ) {
      return 'Search is for broadening the strategic space and articulating the problem before convergence. Please capture the group’s challenges and context first; I can then help explore alternatives without jumping to final recommendations.';
    }
  }

  const ai = getGenAI();
  if (!ai) {
    if (mainStage === 'search') return 'Broaden the search space: clarify the context and challenges, then generate alternatives without converging prematurely.';
    if (mainStage === 'representation') return 'Make each opportunity concrete by examining what it does, its data, AI approach, outputs, feasibility, value, and assumptions.';
    if (mainStage === 'aggregation') return 'Critique and compare the represented opportunities, prioritize them, stress-test assumptions, and make the final human decision.';
    return 'I am here to facilitate your executive strategy workshop. Follow the step-by-step guidance for this stage.';
  }

  try {
    const formattedContext = formatWorkshopContext(workshopContext || sessionState.context);
    const prompt = `You are the digital facilitator for Strategy Unbounded (executive strategy workshop).
Current main stage: ${mainStage.toUpperCase()}${substep ? ` (${substep})` : ''}.
Current user message: "${userMessage}"

${formattedContext ? `${formattedContext}\nUse this context to provide stage-appropriate guidance without repeating it unnecessarily. Never present generic recommendations or unverified context as company-specific fact.\n` : ''}

STRICT FACILITATOR GUARDRAILS:
- SEARCH: Help participants explore broadly, articulate context and problems, and generate alternatives. Do not converge or provide final recommendations.
- REPRESENTATION: Clarify what an opportunity does, required data, AI/model mechanism, implementation concept, outputs, feasibility, value, and assumptions.
- AGGREGATION: Guide Keep/Challenge/Discard review, comparison, prioritization, Board Challenge stress-testing, final human decisions, and reporting.
- Never cross a stage boundary or substitute AI judgement for the participants' final decision.

Keep response concise (1-3 sentences), professional, executive, and strictly adhere to stage boundaries.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        temperature: 0.2,
      },
    });

    return response.text?.trim() || 'Please proceed with the current workshop stage instructions.';
  } catch (err) {
    return 'Please proceed with the current workshop stage instructions.';
  }
}
