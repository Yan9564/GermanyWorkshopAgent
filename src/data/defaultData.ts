/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  WorkshopContext,
  FacilitatorGuidance,
  WorkshopStageId,
  WorkshopSessionState,
  AIExplorationOutput,
  RevisedPrioritiesOutput,
  BoardChallengeOutput,
} from '../types';

export const DEFAULT_WORKSHOP_CONTEXT: WorkshopContext = {
  title: 'Service Continuity and Resilient Supply Chains',
  theme: 'Cross-Ecosystem Resilience & Proactive Disruption Recovery',
  background:
    'Organisations increasingly depend on interconnected suppliers, logistics networks, technology platforms, data infrastructure, partners and customers. Disruptions may originate from geopolitical events, supply-chain interruptions, technology failures, cybersecurity incidents, economic instability, regulatory change or other unexpected developments. A disruption in one part of this ecosystem may have consequences elsewhere with little warning.',
  coreQuestion:
    'How can AI help the organisation anticipate, respond to and recover from disruption while maintaining continuity of service?',
  objective:
    'The objective is NOT simply to identify AI technologies. The objective is to determine where AI could materially strengthen business resilience, service continuity, strategic response and decision quality.',
  workshopTopic: 'Service Continuity and Resilient Supply Chains',
  workshopObjective:
    'Determine where AI could materially strengthen business resilience, service continuity, strategic response and decision quality.',
  processScope: 'Cross-ecosystem disruption sensing, response and service recovery',
  stakeholders: 'Executive committee, operations, procurement, logistics, technology and risk leaders',
};

export const SAMPLE_EXPLORATION_OUTPUT: AIExplorationOutput = {
  challengeAssessment: {
    strategicSignificance:
      'The vulnerabilities identified by the executive team represent acute structural choke-points across global single-source nodes, opaque 3PL sub-tier logistics, and fragmented customer SLA governance.',
    impactNext2To3Years:
      'High systemic vulnerability. Escalating geopolitical regionalization and climate-induced shipping shocks make single-tier supplier reliance an existential continuity hazard.',
    urgencyAndLikelihood:
      'Urgency: Immediate (current freight delays average 3–4 weeks). Likelihood of compounding cascading failure: Very High (>85%).',
    crossEcosystemDependencies:
      'Physical Tier-2 fabrication plants in SE Asia -> Port transshipment hubs -> Cloud ERP/WMS tracking -> Tier-1 final assembly -> Enterprise customer contractual SLA penalties.',
    preservationNote:
      'AI has preserved all human-defined vulnerabilities without substitution, structuring the exploration space specifically around your core choke points.',
  },
  prioritisationOverview:
    'Prioritized 8 high-leverage initiatives with explicit focus on speed-to-value, low initial data friction, and high resilience upside.',
  top3Priorities: [
    {
      opportunityId: 'opp-01',
      rank: 1,
      rationale:
        'Highest immediate resilience ROI. Directly eliminates the #1 single-source blind spot by synthesizing weak supplier signals without requiring extensive internal ERP modifications.',
    },
    {
      opportunityId: 'opp-02',
      rank: 2,
      rationale:
        'High decision-speed multiplier. Converts reactive freight expediting into proactive 48-hour pre-emptive carrier rerouting.',
    },
    {
      opportunityId: 'opp-03',
      rank: 3,
      rationale:
        'Foundational architectural visibility. Unveils deep multi-tier dependencies and identifies alternative qualified component sources.',
    },
  ],
  opportunities: [
    {
      id: 'opp-01',
      number: '01',
      name: 'Multi-Tier Supplier Early-Warning Radar & Disruption Sensing',
      challengesAddressed: [
        'Single-source tier-2 chip and sensor suppliers in SE Asia',
        'Lack of real-time inventory visibility across 3PL partners',
      ],
      whyNow:
        'Multimodal LLMs and satellite/geopolitical data aggregators now allow continuous ambient scanning of tier-2 supplier factory operations, labor strikes, and regional utility blackouts without supplier-side manual reporting.',
      aiUseCase:
        'Continuous ambient NLP synthesis across global news, customs manifests, power grid telemetry, and satellite shipping imagery to detect supplier distress 14–21 days before official notification.',
      strategicOpportunity:
        'Shift from reactive crisis expediting to preemptive component reservation and secondary supplier activation.',
      executionApproach:
        'Deploy pre-trained external intelligence connectors coupled to internal vendor master tables, outputting a daily executive alert matrix.',
      requiredProprietaryData:
        'Tier-1/Tier-2 vendor master list, component SKU critical path mappings, active purchase order volumes.',
      relevantPublicData:
        'Global trade manifests, regional power grid logs, local language industrial news feeds, AIS shipping vessel telemetry.',
      cost: '$$',
      timeline: '<5 weeks',
      priorityTier: 'TOP_3_PRIORITY',
      isTopPriority: true,
      top3Ranking: 1,
    },
    {
      id: 'opp-02',
      number: '02',
      name: 'Dynamic Autonomous Freight Rerouting & Container ETA Predictor',
      challengesAddressed: [
        'Port congestion and customs bottlenecks causing 3-4 week untracked delays',
      ],
      whyNow:
        'Real-time weather, port labor telemetry, and multi-modal logistics models allow predictive ETA modeling with 94% accuracy vs 62% historical standard.',
      aiUseCase:
        'Predictive delay simulation that automatically generates alternative multimodal routing plans (air/rail/sea) and estimates landed cost differentials.',
      strategicOpportunity:
        'Eliminate port dwell times and protect SLA commitments with enterprise customers.',
      executionApproach:
        'Integrate logistics API feeds with dynamic routing agent; human approval threshold for cost deviations over $50k.',
      requiredProprietaryData:
        'Bill of Lading data, carrier contract rate cards, inventory buffer targets by regional DC.',
      relevantPublicData:
        'Port berth waiting times, container dwell indexes, meteorological forecasts, canal transit congestion rates.',
      cost: '$$',
      timeline: '<5 weeks',
      priorityTier: 'TOP_3_PRIORITY',
      isTopPriority: true,
      top3Ranking: 2,
    },
    {
      id: 'opp-03',
      number: '03',
      name: 'Deep Bill-of-Materials (BOM) Component Dependency Knowledge Graph',
      challengesAddressed: [
        'Single-source tier-2 chip and sensor suppliers',
        'Cross-ecosystem dependency opacity',
      ],
      whyNow:
        'Graph neural networks and LLMs can automatically ingest unstructured engineering spec sheets and vendor catalogs to map multi-tier component equivalence.',
      aiUseCase:
        'Automated extraction of pin-compatible or drop-in substitute parts across global component catalogs when primary sources fail.',
      strategicOpportunity:
        'Rapid engineering qualification of alternate components in hours instead of months during sudden supply shocks.',
      executionApproach:
        'Ingest engineering CAD/spec PDFs into a vector knowledge graph linked to global distributor stock inventories.',
      requiredProprietaryData:
        'Engineering BOMs, part qualification specs, approved vendor lists.',
      relevantPublicData:
        'Global component distributor databases (DigiKey, Mouser, Arrow), RoHS/REACH compliance registries.',
      cost: '$$',
      timeline: '<5 weeks',
      priorityTier: 'TOP_3_PRIORITY',
      isTopPriority: true,
      top3Ranking: 3,
    },
    {
      id: 'opp-04',
      number: '04',
      name: 'Synthetic Crisis Simulator & Executive War-Gaming Playbooks',
      challengesAddressed: [
        'Lack of real-time visibility',
        'Fragmented communication and slow incident response',
      ],
      whyNow:
        'Generative simulation engines can run thousands of compound shock scenarios (e.g. Taiwan typhoon + European rail strike + cyber incident) in minutes.',
      aiUseCase:
        'Interactive tabletop scenario engine that stress-tests operational policies and generates pre-approved crisis response action plans.',
      strategicOpportunity:
        'Dramatically improves executive decision speed and institutional memory during unprecedented disruptions.',
      executionApproach:
        'Stand-alone executive decision simulator requiring minimal backend integration; accessible for monthly committee drills.',
      requiredProprietaryData:
        'Historical disruption post-mortems, operational escalation matrix, safety stock policies.',
      relevantPublicData:
        'Historical geopolitical disruption case studies, macroeconomic shock data.',
      cost: '$',
      timeline: '<5 days',
      priorityTier: 'HIGH',
      isTopPriority: false,
    },
    {
      id: 'opp-05',
      number: '05',
      name: 'Predictive Buffer Stock & Working Capital Optimizer',
      challengesAddressed: [
        'Lack of real-time inventory visibility across 3PL partner warehouses',
      ],
      whyNow:
        'Probabilistic machine learning models can balance safety stock holding costs against stockout penalty costs under high volatility.',
      aiUseCase:
        'Dynamic recommendation of optimal safety stock levels per SKU and warehouse location based on real-time disruption probability scores.',
      strategicOpportunity:
        'Reduces working capital lockup by 18% while simultaneously increasing resilience against 30-day stockouts.',
      executionApproach:
        'Connect to ERP inventory snapshots and run weekly batch optimization runs.',
      requiredProprietaryData:
        'Historical demand time-series, SKU holding costs, stockout contract penalties.',
      relevantPublicData:
        'Commodity price indices, inflation trends, central bank interest rate curves.',
      cost: '$$',
      timeline: '<5 weeks',
      priorityTier: 'MEDIUM',
      isTopPriority: false,
    },
    {
      id: 'opp-06',
      number: '06',
      name: 'Automated 3PL Contract Compliance & SLA Drift Monitor',
      challengesAddressed: [
        'Fragmented customer communication and inaccurate SLA commitments',
      ],
      whyNow:
        'Document-intelligence models can parse thousands of carrier rate sheets, SLA agreements, and invoice manifests in real-time.',
      aiUseCase:
        'Real-time reconciliation of carrier delivery logs against contracted performance guarantees, flagging systematic drift.',
      strategicOpportunity:
        'Enforces accountability across logistics partners and recovers unearned demurrage/delay fees.',
      executionApproach:
        'Cloud document ingestion pipeline parsing freight invoices and telematics timestamps.',
      requiredProprietaryData:
        '3PL master services agreements, carrier invoices, proof of delivery timestamps.',
      relevantPublicData: 'Standard carrier benchmark tariffs.',
      cost: '$',
      timeline: '<5 days',
      priorityTier: 'QUICK_WIN',
      isTopPriority: false,
    },
    {
      id: 'opp-07',
      number: '07',
      name: 'Cyber-Physical SCADA Anomaly Detector for Manufacturing Plants',
      challengesAddressed: [
        'Cybersecurity intrusions targeting legacy industrial systems',
      ],
      whyNow:
        'Unsupervised autoencoder models can baseline normal sensor vibration/thermal/packet behaviors and detect zero-day tampering.',
      aiUseCase:
        'Real-time edge telemetry monitoring to prevent malicious operational shutdowns or equipment sabotage.',
      strategicOpportunity:
        'Protects continuous manufacturing uptime against state-sponsored or ransomware threats.',
      executionApproach:
        'Deploy non-intrusive network tap and edge inference hardware in pilot manufacturing facility.',
      requiredProprietaryData:
        'Plant network traffic logs, PLC sensor telemetry, maintenance logs.',
      relevantPublicData: 'MITRE ATT&CK ICS threat signatures, CVE databases.',
      cost: '$$$',
      timeline: '<5 months',
      priorityTier: 'TRANSFORMATIONAL',
      isTopPriority: false,
    },
    {
      id: 'opp-08',
      number: '08',
      name: 'Proactive Customer Continuity Portal & Intelligent SLA Re-Commitment',
      challengesAddressed: [
        'Fragmented customer communication during major outages',
      ],
      whyNow:
        'LLM agents can synthesize real-time logistics telemetry into tailored, customer-specific impact briefings with transparent mitigation options.',
      aiUseCase:
        'Automated generation of proactive customer notifications, revised delivery timelines, and alternative fulfillment options during network disruptions.',
      strategicOpportunity:
        'Transforms supply chain crises into customer trust and retention advantages through radical transparency.',
      executionApproach:
        'Integrate CRM customer notification engine with logistics event trigger pipeline.',
      requiredProprietaryData:
        'CRM customer order book, SLA penalty terms, customer tier hierarchy.',
      relevantPublicData: 'Public carrier tracking portals.',
      cost: '$$',
      timeline: '<5 weeks',
      priorityTier: 'MEDIUM',
      isTopPriority: false,
    },
  ],
};

export const SAMPLE_REVISED_PRIORITIES: RevisedPrioritiesOutput = {
  executiveAlignmentRationale:
    'Human executive review validated the critical importance of upstream supplier sensing while introducing decisive guardrails: rejecting autonomous spot contracting, mandating human spend thresholds ($50k), and merging deep BOM graph dependencies into the core radar platform.',
  revisedPriorities: [
    {
      id: 'priority-opp-01',
      rank: 1,
      originalOpportunityId: 'opp-01',
      originalName: 'Multi-Tier Supplier Early-Warning Radar & Disruption Sensing',
      humanFeedbackSummary:
        'Executive committee strongly endorsed. Requested merging Opportunity 03 (BOM Graph) into this single platform for consolidated Tier-2 visibility.',
      revisedStrategicFocus:
        'Multi-Tier Supplier Disruption Radar & Deep BOM Dependency Platform',
      justification:
        'Provides single-pane-of-glass visibility connecting Tier-2 supplier geopolitical risk directly to part-level CAD and alternative component sourcing.',
      status: 'MODIFIED',
    },
    {
      id: 'priority-opp-02',
      rank: 2,
      originalOpportunityId: 'opp-02',
      originalName: 'Dynamic Autonomous Freight Rerouting & Container ETA Predictor',
      humanFeedbackSummary:
        'Approved with mandatory governance restriction: removed "autonomous" contracting. Added human-in-the-loop sign-off on any freight expenditure above $50k.',
      revisedStrategicFocus:
        'AI Freight Intelligence & Dynamic Rerouting with Human Financial Controls',
      justification:
        'Delivers real-time ETA accuracy and proactive carrier rerouting without exposing the organization to unconstrained spot freight commitments.',
      status: 'MODIFIED',
    },
    {
      id: 'priority-opp-03',
      rank: 3,
      originalOpportunityId: 'opp-04',
      originalName: 'Synthetic Crisis Simulator & Executive War-Gaming Playbooks',
      humanFeedbackSummary:
        'Elevated to Top 3 due to <5 day rapid implementation timeline and zero ERP dependencies, providing immediate organizational rehearsal value.',
      revisedStrategicFocus:
        'Synthetic Crisis Simulator & War-Gaming Decision Playbooks',
      justification:
        'Builds immediate executive muscle memory for compound disruptions while deep data integrations for long-term platforms are engineered.',
      status: 'MODIFIED',
    },
  ],
};

export const SAMPLE_BOARD_CHALLENGE: BoardChallengeOutput = {
  boardRoleDescription:
    'Fortune 500 Board / Executive Risk Committee: Global Strategy, Capital Allocation & Governance Oversight',
  executiveCommitteeVerdict:
    'The Committee commends management for establishing clear operational priorities and incorporating human spend controls. However, critical vulnerabilities remain in data integrity incentives, automation complacency during high-stress crises, and vendor counterparty willingness to participate.',
  prioritiesChallenged: [
    {
      priorityRank: 1,
      priorityName: 'Multi-Tier Supplier Disruption Radar & Deep BOM Dependency Platform',
      executionFriction: {
        failurePoint1:
          '1. Data Omission Bias: Tier-2 suppliers facing acute financial or operational distress will actively obscure weak signals and refuse to connect to corporate telemetry gateways.',
        failurePoint2:
          '2. Misplaced Confidence in Web-Scraped NLP: Ambient news and satellite models frequently hallucinate localized port capacity during severe geopolitical crises, risking premature executive escalations.',
        failurePoint3:
          '3. Engineering Silos: Component engineering teams historically take 6–8 weeks to qualify alternative BOM substitutes, bottlenecking the radar’s rapid identification benefit.',
      },
      governanceAndRisk: {
        materialWorstCaseScenario:
          'Management acts on an unverified satellite AI alert by canceling a strategic Tier-1 contract, triggering litigation and permanently alienating the sole domestic fabrication source.',
        safeguardSufficiency: 'PARTIALLY_SUFFICIENT',
        safeguardReasoning:
          'Management has defined the platform architecture but has not instituted mandatory manual verification protocols before contractual supplier escalations occur.',
        singleMostImportantRemainingGap:
          'Establish a formal "Dual-Verification Gate" requiring human procurement confirmation and on-the-ground agent verification before shifting production allocations.',
      },
    },
    {
      priorityRank: 2,
      priorityName: 'AI Freight Intelligence & Dynamic Rerouting with Human Financial Controls',
      executionFriction: {
        failurePoint1:
          '1. Herd Dynamics in Alternate Routes: When AI recommends secondary logistics corridors (e.g. rail vs air), competing firms using identical algorithms create secondary congestions within 72 hours.',
        failurePoint2:
          '2. Human Rubber-Stamping under Stress: During widespread disruptions, logistics managers overwhelmed with hundreds of $49k exception requests will approve rerouting without scrutiny (automation bias).',
        failurePoint3:
          '3. Unreliable 3PL Telematics: Sub-contracted transit drivers frequently disable GPS sensors or falsify milestone check-ins, corrupting the ETA prediction pipeline.',
      },
      governanceAndRisk: {
        materialWorstCaseScenario:
          'Cascading reroute commitments commit $4M in cumulative expedited airfreight across a 10-day period for low-margin goods, destroying quarterly operating margin.',
        safeguardSufficiency: 'PARTIALLY_SUFFICIENT',
        safeguardReasoning:
          'The $50k transaction cap prevents single runaway contracts, but lacks a cumulative weekly aggregate budget ceiling.',
        singleMostImportantRemainingGap:
          'Institute a rolling 7-day cumulative aggregate spending ceiling ($250k) with mandatory CFO escalation.',
      },
    },
    {
      priorityRank: 3,
      priorityName: 'Synthetic Crisis Simulator & War-Gaming Decision Playbooks',
      executionFriction: {
        failurePoint1:
          '1. Fighting the Last War: Simulator scenarios over-index on historical disruptions (COVID-19, Suez Canal) and fail to simulate novel compound cyber-physical threats.',
        failurePoint2:
          '2. Lack of Operational Incentive Alignment: Plant managers evaluated on local unit cost metrics will resist running simulated emergency throttle-down drills.',
        failurePoint3:
          '3. Shelfware Risk: Simulation playbooks become obsolete within 60 days unless directly updated whenever supplier contracts or bills of material change.',
      },
      governanceAndRisk: {
        materialWorstCaseScenario:
          'False sense of security leading to delayed response when a real-world disruption defies simulated parameters.',
        safeguardSufficiency: 'SUFFICIENT',
        safeguardReasoning:
          'Low capital risk ($) and standalone architecture provide valuable training without exposing core business systems to systemic failure.',
        singleMostImportantRemainingGap:
          'Schedule mandatory bi-monthly executive tabletop drills with unannounced scenario injections.',
      },
    },
  ],
  boardRecommendations: [
    'Condition capital allocation on establishing aggregate weekly spend caps for freight rerouting.',
    'Require human dual-custody signoff on any strategic supplier contract reallocation.',
    'Integrate simulation exercise learnings into annual business unit performance reviews.',
  ],
};

export const STAGE_GUIDANCE: Record<WorkshopStageId, FacilitatorGuidance> = {
  0: {
    stageId: 0,
    stageName: 'Home',
    role: 'Workshop Briefing Facilitator',
    whereYouAre: 'Workshop Briefing & Orientation',
    whatYouShouldDo: 'Review the strategic challenge context and prepare your team for the session.',
    whatInputIsExpected: 'Click "Start Workshop" when your executive team is convened.',
    whatHappensNext: 'Stage 1 will establish shared understanding and ground rules.',
    tips: [
      'Encourage open debate across business, tech, and operations leaders.',
      'Human strategic judgement leads; AI assists, structures, and challenges.',
    ],
  },
  1: {
    stageId: 1,
    stageName: 'Understand the Challenge',
    role: 'Neutral Facilitator',
    whereYouAre: 'Stage 1 of 6 — Understand the Challenge',
    whatYouShouldDo: 'Align on the strategic scope, the ecosystem dependencies, and the workshop objectives.',
    whatInputIsExpected: 'Read the framing carefully and ensure all participants share the context. Click Continue.',
    whatHappensNext: 'In Stage 2, your team will record your own challenges and ideas before AI introduces any analysis.',
    tips: [
      'Notice: The AI will strictly refrain from suggesting solutions at this stage to prevent anchoring bias.',
      'Focus on material business impact rather than minor operational friction.',
    ],
  },
  2: {
    stageId: 2,
    stageName: 'Discuss as a Team',
    role: 'Active Listener & Recorder',
    whereYouAre: 'Stage 2 of 6 — Discuss as a Team (Human-Only Capture)',
    whatYouShouldDo: 'Discuss Question 1 (threats & vulnerabilities) and Question 2 (initial AI opportunities).',
    whatInputIsExpected: 'Type 3–5 key challenges & initial ideas, or snap & upload a photo of your whiteboard / sticky notes.',
    whatHappensNext: 'The AI will extract and structure your whiteboard, ask you to verify accuracy, then explore strategic opportunities in Stage 3.',
    tips: [
      'Upload real whiteboard photos, flipcharts, or sticky notes — multimodal AI will structure the contents.',
      'You must confirm or edit the extracted text before the workshop state is updated.',
    ],
  },
  3: {
    stageId: 3,
    stageName: 'Explore with AI',
    role: 'Strategic Co-Pilot & Search Space Expander',
    whereYouAre: 'Stage 3 of 6 — Explore with AI (Opportunity Landscape)',
    whatYouShouldDo: 'Review the AI-generated assessment of your challenges and the 8–10 distinct AI-enabled strategic opportunities.',
    whatInputIsExpected: 'Examine the Top 3 AI priorities, their data requirements, cost tiers, and timelines.',
    whatHappensNext: 'In Stage 4, your team will review each opportunity, marking them Keep, Challenge, or Discard, or upload whiteboard feedback.',
    tips: [
      'Notice how the AI preserves your framing instead of replacing your team\'s perspective.',
      'Check the why-now factors, execution approaches, and data dependencies.',
    ],
  },
  4: {
    stageId: 4,
    stageName: 'Review & Refine',
    role: 'Strategic Synthesizer',
    whereYouAre: 'Stage 4 of 6 — Review & Refine (Human Evaluation)',
    whatYouShouldDo: 'Evaluate each AI opportunity with your team. Mark them KEEP, CHALLENGE, or DISCARD, and add notes.',
    whatInputIsExpected: 'Interact with opportunity cards or upload a photo of your physical feedback whiteboard to synthesize revised priorities.',
    whatHappensNext: 'The AI will synthesize your feedback into 3 revised priorities and prepare for the Board Challenge in Stage 5.',
    tips: [
      'You can upload photos of handwritten critiques, sticky notes, or re-rankings.',
      'The AI explicitly preserves original AI proposals and contrasts them with your human revisions.',
    ],
  },
  5: {
    stageId: 5,
    stageName: 'Challenge the Strategy',
    role: 'Board-Level Critical Challenger',
    whereYouAre: 'Stage 5 of 6 — Board Challenge Mode (Stress-Testing)',
    whatYouShouldDo: 'Review the critical stress-test of your 3 priorities conducted by the simulated Fortune 500 Board / Executive Committee.',
    whatInputIsExpected: 'Examine the 3 concrete execution failure points per priority and the governance/downside gap analysis.',
    whatHappensNext: 'In Stage 6, you will make the final executive decision, retaining authority over strategic choices.',
    tips: [
      'The AI challenger exposes blind spots, unstated assumptions, and behavioural failure mechanisms.',
      'Notice that the AI does NOT replace your 3 priorities — it tests them with Board-level rigor.',
    ],
  },
  6: {
    stageId: 6,
    stageName: 'Make Your Decision',
    role: 'Executive Secretariat',
    whereYouAre: 'Stage 6 of 6 — Make Your Decision (Human Judgement)',
    whatYouShouldDo: 'Apply executive judgement: confirm, edit, or reorder your final 3 strategic priorities and record the rationale.',
    whatInputIsExpected: 'Select your final priorities, add safeguards learned from the Board Challenge, and finalize the decision.',
    whatHappensNext: 'An executive-ready Strategy Brief will be generated for Board and senior leadership distribution.',
    tips: [
      'Strategic decision authority remains 100% human.',
      'Your final output records the full evolutionary trail: Human framing → AI exploration → Human review → Board challenge → Decision.',
    ],
  },
  7: {
    stageId: 7,
    stageName: 'Executive Strategy Brief',
    role: 'Executive Documentation',
    whereYouAre: 'Workshop Complete — Executive Strategy Brief',
    whatYouShouldDo: 'Review the final synthesized strategy document, export as PDF/Markdown, or copy to clipboard.',
    whatInputIsExpected: 'Export or share with leadership.',
    whatHappensNext: 'Implement the agreed 5-day and 5-week strategic initiatives.',
    tips: ['The generated brief provides complete auditability of strategic reasoning.'],
  },
};

export const INITIAL_WORKSHOP_STATE: WorkshopSessionState = {
  currentStage: 0,
  context: DEFAULT_WORKSHOP_CONTEXT,
  humanDiscussion: {
    challenges: [],
    initialAIIdeas: [],
    rawTextNotes: '',
    isConfirmed: false,
    uploadedImages: [],
  },
  aiExploration: null,
  humanReviews: {},
  stage4FeedbackImages: [],
  revisedPriorities: null,
  boardChallenge: null,
  finalDecision: null,
  interactions: [],
  isLoading: false,
  loadingMessage: '',
  lastUpdated: Date.now(),
};

// Preset sample whiteboard data with high quality simulated drawings / text
export const SAMPLE_WHITEBOARD_IMAGES = {
  supply_chain_whiteboard: {
    name: 'Executive_Whiteboard_Room_4B.png',
    dataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500"><rect width="800" height="500" fill="%23f8fafc"/><rect x="20" y="20" width="760" height="460" rx="12" fill="%23ffffff" stroke="%23cbd5e1" stroke-width="4"/><text x="50" y="70" font-family="sans-serif" font-size="22" font-weight="bold" fill="%231e293b">WORKSHOP FLIPCHART: CORE VULNERABILITIES &amp; AI RADAR</text><line x1="50" y1="85" x2="750" y2="85" stroke="%23e2e8f0" stroke-width="2"/><text x="50" y="130" font-family="sans-serif" font-size="16" font-weight="bold" fill="%234f46e5">1. Tier-2 Supplier Blindspots</text><text x="70" y="155" font-family="sans-serif" font-size="14" fill="%23475569">- Single-source chip plants in SE Asia at extreme climate/shutdown risk</text><text x="50" y="200" font-family="sans-serif" font-size="16" font-weight="bold" fill="%234f46e5">2. Port Transshipment Bottlenecks</text><text x="70" y="225" font-family="sans-serif" font-size="14" fill="%23475569">- 3-4 week untracked delay; zero live ETA visibility across 3PL hubs</text><text x="50" y="270" font-family="sans-serif" font-size="16" font-weight="bold" fill="%234f46e5">3. Industrial Cyber Threats</text><text x="70" y="295" font-family="sans-serif" font-size="14" fill="%23475569">- Legacy SCADA operational technology vulnerabilities at manufacturing sites</text><text x="50" y="350" font-family="sans-serif" font-size="16" font-weight="bold" fill="%23059669">INITIAL AI IDEAS:</text><text x="70" y="375" font-family="sans-serif" font-size="14" fill="%23475569">- Ambient satellite &amp; news supplier disruption radar</text><text x="70" y="400" font-family="sans-serif" font-size="14" fill="%23475569">- Dynamic container freight rerouting &amp; SLA prediction</text><text x="70" y="425" font-family="sans-serif" font-size="14" fill="%23475569">- Synthetic war-gaming crisis simulator (&lt;5 days setup)</text></svg>',
  },
};

export const SAMPLE_WHITEBOARD_DATA = {
  stage2: {
    name: 'Executive_Whiteboard_Room_4B.png',
    title: 'Room 4B Flipchart: Supply Vulnerabilities & AI Ideas',
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
  },
  stage4Feedback: {
    name: 'Team_StickyNotes_Critique.png',
    title: 'Executive Committee Sticky Note Review',
    agreements: [
      'Strongly agree on Priority 1 (Predictive Supplier Risk Intelligence) as the anchor capability.',
      'Validate Opportunity 04 (Autonomous Dynamic Logistics Re-routing) for short-term operations.',
    ],
    disagreements: [
      'Priority 2 (Autonomous Contract Renegotiation) is premature; legal compliance and counterparty trust make full autonomy too risky.',
    ],
    challenges: [
      'Priority 3 timeline is too optimistic; legacy SAP ERP integration will take at least 4 months, not 5 weeks.',
      'Implementation budget for Tier-3 supplier IoT monitoring might exceed $$ bracket.',
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
    uncertainties: [],
  },
};
