/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { MainStage } from './workshopStages';

export type WorkshopStageId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type EntitySource = 'ai' | 'human' | 'ai_edited_by_human';

export type InteractionActionType =
  | 'edit'
  | 'add'
  | 'delete'
  | 'keep'
  | 'challenge'
  | 'discard'
  | 'rank_change'
  | 'select'
  | 'deselect'
  | 'feedback'
  | 'regenerate'
  | 'other';

export type InteractionEntityType =
  | 'challenge'
  | 'opportunity'
  | 'priority'
  | 'representation'
  | 'feedback'
  | 'other';

export interface WorkshopInteractionEvent {
  id: string;
  timestamp: string;
  sessionId?: string;
  stage: MainStage;
  subStep?: string;
  actionType: InteractionActionType;
  entityType: InteractionEntityType;
  entityId?: string;
  originalValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
}

export type WorkshopInteractionInput = Omit<
  WorkshopInteractionEvent,
  'id' | 'timestamp' | 'sessionId'
>;

export interface WorkshopChallenge {
  id: string;
  text: string;
  source: EntitySource;
  originalAIText?: string;
}

export interface WorkshopContext {
  title: string;
  theme: string;
  background: string;
  coreQuestion: string;
  objective: string;
  organization?: string;
  industry?: string;
  businessUnit?: string;
  /** Legacy fields retained only to migrate existing saved sessions. */
  workshopTopic?: string;
  workshopObjective?: string;
  processScope?: string;
  stakeholders?: string;
  currentChallenges?: string;
  strategicPriorities?: string;
  constraints?: string;
  additionalContext?: string;
}

export interface UploadedWhiteboard {
  id: string;
  dataUrl: string;
  name: string;
  timestamp: number;
  stage: number;
  status: 'idle' | 'analyzing' | 'extracted' | 'error';
  extraction?: ImageExtractionResult;
  feedbackExtraction?: WhiteboardFeedbackExtraction;
  errorMessage?: string;
}

export interface ImageExtractionResult {
  rawSummary: string;
  challenges: string[];
  initialAIIdeas: string[];
  uncertainties: string[];
  isConfirmed: boolean;
  confidenceScore?: number;
}

export interface HumanDiscussionData {
  challenges: string[];
  initialAIIdeas: string[];
  rawTextNotes?: string;
  /** Immutable source extraction; reviewed challenges live in challenges. */
  whiteboardExtractedChallenges?: string[];
  isConfirmed: boolean;
  uploadedImages: UploadedWhiteboard[];
  confirmedAt?: number;
}

export type CostTier = '$' | '$$' | '$$$';
export type TimelineTier = '<5 days' | '<5 weeks' | '<5 months';
export type PriorityLevel = 'High' | 'Medium' | 'Low' | 'TOP_3_PRIORITY' | 'HIGH' | 'MEDIUM' | 'LOW' | 'QUICK_WIN' | 'TRANSFORMATIONAL';

export interface AIOpportunity {
  id: string;
  number: string;
  name: string;
  challengesAddressed: string[];
  whyNow: string;
  aiUseCase: string;
  strategicOpportunity: string;
  executionApproach: string;
  requiredProprietaryData: string;
  relevantPublicData: string;
  relevantStakeholders?: string;
  keyAssumption?: string;
  potentialValue?: string;
  cost: CostTier;
  timeline: TimelineTier;
  priorityTier: PriorityLevel;
  isTopPriority: boolean;
  top3Ranking?: number;
  prioritizationRationale?: string;
  source?: EntitySource;
  originalAIValue?: Partial<AIOpportunity>;
}

export interface ChallengeAssessment {
  strategicSignificance: string;
  impactNext2To3Years: string;
  urgencyAndLikelihood: string;
  crossEcosystemDependencies: string;
  keyAssumptionsOrOverlaps?: string;
  preservationNote?: string;
}

export interface AIExplorationOutput {
  challengeAssessment: ChallengeAssessment;
  opportunities: AIOpportunity[];
  top3Priorities: {
    rank: number;
    opportunityId: string;
    name?: string;
    rationale: string;
  }[];
  prioritisationOverview: string;
  generatedAt?: number;
}

export type ReviewDecision = 'KEEP' | 'CHALLENGE' | 'DISCARD';

export interface HumanOpportunityReview {
  opportunityId: string;
  decision: ReviewDecision;
  comment: string;
}

export interface WhiteboardFeedbackExtraction {
  agreements: string[];
  disagreements: string[];
  challenges: string[];
  merges: string[];
  newAssumptions: string[];
  additionalContext?: string[];
  rawSummary?: string;
  rawNotes?: string;
  uncertainties?: string[];
  isConfirmed: boolean;
}

export interface RevisedPriority {
  id: string;
  rank: number;
  originalOpportunityId?: string;
  originalName: string;
  humanFeedbackSummary: string;
  revisedStrategicFocus: string;
  justification: string;
  status: 'CONFIRMED' | 'MODIFIED' | 'SUBSTITUTED';
}

export interface RevisedPrioritiesOutput {
  revisedPriorities: RevisedPriority[];
  executiveAlignmentRationale: string;
  generatedAt?: number;
  isConfirmed?: boolean;
}

export type SafeguardSufficiency = 'SUFFICIENT' | 'PARTIALLY_SUFFICIENT' | 'MATERIALLY_INSUFFICIENT';

export interface ExecutionFriction {
  failurePoint1: string;
  failurePoint2: string;
  failurePoint3: string;
}

export interface GovernanceAndRisk {
  materialWorstCaseScenario: string;
  safeguardSufficiency: SafeguardSufficiency;
  safeguardReasoning: string;
  singleMostImportantRemainingGap: string;
}

export interface BoardChallengePriorityReview {
  priorityRank: number;
  priorityName: string;
  executionFriction: ExecutionFriction;
  governanceAndRisk: GovernanceAndRisk;
}

export interface BoardChallengeOutput {
  boardRoleDescription?: string;
  executiveCommitteeVerdict: string;
  prioritiesChallenged: BoardChallengePriorityReview[];
  boardRecommendations: string[];
  generatedAt?: number;
}

export interface FinalStrategicPriority {
  rank: number;
  name: string;
  rationale: string;
  safeguardsAdopted: string;
  timeframe: string;
}

export interface FinalHumanDecision {
  finalPriorities: FinalStrategicPriority[];
  finalExecutiveRationale: string;
  keyOpenQuestions: string[];
  confirmedAt: number;
  facilitatorSignoffNotes: string;
}

export interface FacilitatorGuidance {
  stageId: WorkshopStageId;
  stageName: string;
  role: string;
  whereYouAre: string;
  whatYouShouldDo: string;
  whatInputIsExpected: string;
  whatHappensNext: string;
  tips: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  stageId?: WorkshopStageId;
}

export interface WorkshopSessionState {
  id?: string;
  currentStage: WorkshopStageId;
  /** Semantic stage used by new integrations; currentStage remains for saved-session compatibility. */
  mainStage?: MainStage;
  context: WorkshopContext;
  challengeEntities?: WorkshopChallenge[];
  humanDiscussion: HumanDiscussionData;
  exploration?: AIExplorationOutput | null;
  longList?: AIOpportunity[];
  aiExploration?: AIExplorationOutput | null;
  humanReview?: {
    reviews: Record<string, HumanOpportunityReview>;
    whiteboardFeedback: WhiteboardFeedbackExtraction | null;
  };
  humanReviews?: Record<string, HumanOpportunityReview>;
  stage4FeedbackImages?: UploadedWhiteboard[];
  revisedPriorities: RevisedPrioritiesOutput | null;
  boardChallenge: BoardChallengeOutput | null;
  finalDecision: FinalHumanDecision | null;
  chatHistory?: ChatMessage[];
  interactions: WorkshopInteractionEvent[];
  isLoading?: boolean;
  loadingMessage?: string;
  lastUpdated?: number;
  createdAt?: number;
  updatedAt?: number;
}
