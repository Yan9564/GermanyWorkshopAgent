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
import { buildDynamicOpportunityShortlist } from '../src/dynamicOpportunities';

export const OPPORTUNITY_MODEL = 'gemini-3.7-flash';

const createRequestId = () => `generation-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const isOpportunity = (value: unknown): value is AIExplorationOutput['opportunities'][number] => {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  const requiredStrings = ['id', 'number', 'name', 'whyNow', 'aiUseCase', 'strategicOpportunity', 'executionApproach', 'requiredProprietaryData', 'relevantPublicData', 'relevantStakeholders', 'keyAssumption', 'potentialValue', 'prioritizationRationale'];
  return requiredStrings.every((field) => typeof item[field] === 'string' && Boolean((item[field] as string).trim()))
    && Array.isArray(item.challengesAddressed) && item.challengesAddressed.length > 0
    && ['$', '$$', '$$$'].includes(String(item.cost))
    && ['<5 days', '<5 weeks', '<5 months'].includes(String(item.timeline));
};

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
    console.error('[GeminiService] Failed to parse JSON response:', err, { responseLength: rawText.length });
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
    ['Objective', context.objective || context.workshopObjective],
    ['Process / Workflow in Scope', context.processScope],
    ['Key Stakeholders / Users', context.stakeholders],
    ['Current Challenges / Pain Points', context.currentChallenges],
    ['Strategic Priorities', context.strategicPriorities],
    ['Constraints', context.constraints],
    ['Additional Context', context.additionalContext],
  ];
  const populated = fields.filter(([, value]) => typeof value === 'string' && value.trim());
  if (populated.length === 0) return '';
  return `EXERCISE CONTEXT (supporting background; do not treat as participant-provided challenge evidence)\n${populated
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
- Extract only substantive business or process challenges. Ignore participant/facilitator commentary, instructions, counts, and logistics.
- Do not treat statements such as “we identified 3 challenges”, “we discussed this already”, “let’s move on”, or “this is challenge number 2” as challenges.
- Do not invent challenge content. When image and free text are both supplied, incorporate both sources and preserve conflicts for human review rather than guessing.
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
 * Generate 8 distinct AI-enabled strategic opportunities (SEARCH — Explore AI Opportunities)
 */
export async function generateAIOpportunities(
  humanDiscussion: HumanDiscussionData,
  contextTitle: string,
  workshopContext?: Partial<WorkshopContext>,
  manuallyEditedChallenges: string[] = [],
): Promise<AIExplorationOutput> {
  const ai = getGenAI();
  const requestId = createRequestId();
  const generatedAt = Date.now();
  const sourceOfTruth = {
    workshopContext: { ...(workshopContext || {}), title: workshopContext?.title || contextTitle },
    searchStageInput: {
      confirmedChallenges: humanDiscussion.challenges || [],
      manuallyEditedChallenges,
      initialAIIdeas: humanDiscussion.initialAIIdeas || [],
      rawTextNotes: humanDiscussion.rawTextNotes || '',
      whiteboardExtractedChallenges: humanDiscussion.whiteboardExtractedChallenges || [],
      isConfirmed: humanDiscussion.isConfirmed,
    },
  };
  const contextFieldLengths = Object.entries(sourceOfTruth.workshopContext)
    .filter(([, value]) => typeof value === 'string' && value.trim())
    .map(([field, value]) => ({ field, length: String(value).length }));
  const searchFieldLengths = Object.entries(sourceOfTruth.searchStageInput).map(([field, value]) => ({
    field,
    length: Array.isArray(value) ? value.length : typeof value === 'string' ? value.length : Number(Boolean(value)),
  }));
  console.info('[GeminiService] Opportunity generation request', { requestId, contextFieldLengths, searchFieldLengths });

  const fallback = buildDynamicOpportunityShortlist(humanDiscussion, workshopContext, requestId);
  fallback.generationMetadata = {
    provider: 'gemini', model: OPPORTUNITY_MODEL, generatedAt, requestId, generationMode: 'fallback',
  };
  if (!ai) {
    console.warn(`[GeminiService] ${requestId} using explicit degraded fallback: GEMINI_API_KEY is unavailable.`);
    return fallback;
  }

  try {
    const prompt = `You are a world-class executive strategy advisor. Generate a fresh opportunity set for request ${requestId}.

SOURCE OF TRUTH (JSON):
${JSON.stringify(sourceOfTruth, null, 2)}

Use every populated source field. Confirmed and manually edited challenges are authoritative. Preserve participant meaning and do not invent organisation-specific facts. Reason afresh for this request: do not use a fixed opportunity catalogue or recurring named archetypes. Explore materially different intervention points, users, decisions, workflows, and value mechanisms while remaining practical and grounded.

First derive a broad candidate space with themes, value levers, AI methods, and delivery patterns grounded in the source of truth. Then synthesize and rank exactly 8 distinct strategic AI opportunities from that space. Balance relevance, impact, urgency, data availability, feasibility, cost, speed, and decision quality. Exactly three must be marked as top priorities.

Return strict JSON with this shape:
{
  "challengeAssessment": {
    "strategicSignificance": "string", "impactNext2To3Years": "string",
    "urgencyAndLikelihood": "string", "crossEcosystemDependencies": "string",
    "keyAssumptionsOrOverlaps": "string"
  },
  "candidateSpace": {
    "themes": ["string"], "valueLevers": ["string"],
    "aiMethods": ["string"], "deliveryPatterns": ["string"]
  },
  "opportunities": [{
    "id": "temporary-id", "number": "01", "name": "string",
    "challengesAddressed": ["participant input"], "whyNow": "string",
    "aiUseCase": "specific AI technique or architecture", "strategicOpportunity": "string",
    "executionApproach": "string", "requiredProprietaryData": "string",
    "relevantPublicData": "string", "relevantStakeholders": "string",
    "keyAssumption": "string", "potentialValue": "string",
    "cost": "$ or $$ or $$$", "timeline": "<5 days or <5 weeks or <5 months",
    "priorityTier": "High or Medium or Low", "isTopPriority": true,
    "top3Ranking": 1, "prioritizationRationale": "string"
  }],
  "top3Priorities": [{"rank": 1, "opportunityId": "temporary-id", "name": "string", "rationale": "string"}],
  "prioritisationOverview": "string"
}`;

    const response = await ai.models.generateContent({
      model: OPPORTUNITY_MODEL,
      contents: prompt,
      config: { responseMimeType: 'application/json', temperature: 0.85 },
    });
    const parsed = parseCleanJson<AIExplorationOutput>(response.text || '', fallback);
    if (!Array.isArray(parsed.opportunities) || parsed.opportunities.length < 8 || !parsed.opportunities.slice(0, 8).every(isOpportunity)) {
      console.error(`[GeminiService] ${requestId} returned an invalid schema; using degraded fallback.`);
      return fallback;
    }
    parsed.opportunities = parsed.opportunities.slice(0, 8).map((opportunity, index) => ({
      ...opportunity,
      id: `${requestId}-opp-${index + 1}`,
      number: String(index + 1).padStart(2, '0'),
      isTopPriority: index < 3,
      top3Ranking: index < 3 ? index + 1 : undefined,
    }));
    parsed.top3Priorities = parsed.opportunities.slice(0, 3).map((opportunity, index) => ({
      rank: index + 1, opportunityId: opportunity.id, name: opportunity.name,
      rationale: opportunity.prioritizationRationale || 'Ranked for relevance, value, and feasibility.',
    }));
    parsed.generatedAt = Date.now();
    parsed.generationMetadata = {
      provider: 'gemini', model: OPPORTUNITY_MODEL, generatedAt: parsed.generatedAt,
      requestId, generationMode: 'gemini',
    };
    return parsed;
  } catch (error) {
    console.error(`[GeminiService] ${requestId} Gemini generation failed:`, error);
    console.warn(`[GeminiService] ${requestId} using explicit degraded fallback after Gemini failure.`);
    return fallback;
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
