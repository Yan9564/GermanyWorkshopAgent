export interface UseCase {
  id: string
  sessionId: string
  problemId: string
  problemIndex: number
  title: string
  summary: string
  aiPriority: 1 | 2 | 3 | null
  userPriority: 1 | 2 | 3 | null
  feedback: 'up' | 'down' | null
  description: string
  howItWorks: string[]
  dataRequired: string
  timeToImplement: string
  complexity: 'Low' | 'Medium' | 'High'
  estimatedCostRoi: string
  alsoAddresses: number[]
}

export interface Problem {
  id: string
  index: number
  text: string
  useCases: UseCase[]
}

export interface Session {
  id: string
  status: string
  problems: Problem[]
}

export type AvatarStage =
  | 'intro'
  | 'problem_input_empty'
  | 'problem_input_partial'
  | 'problem_input_ready'
  | 'processing'
  | 'results_overview'
  | 'results_with_votes'
  | 'card_detail'
  | 'card_detail_with_feedback'
  | 'discussion'
  | 'confirm_use_case'
  | 'stage2_generating'
  | 'stage2_view'
  | 'stage2_annotating'

export type Priority = 1 | 2 | 3

export type Feedback = 'up' | 'down' | null

export interface DiscussionEntry {
  id: string
  speakerLabel: string | null
  transcript: string
  recordedAt: string
}

// --- Stage 2 types ---

export type RepType = 'journey_map' | 'dashboard' | 'impact_canvas' | 'pipeline'

export interface JourneyStep {
  label: string
  description: string
  time_estimate: string | null
  is_ai_powered: boolean
}

export interface JourneyMapData {
  persona: string
  current_steps: JourneyStep[]
  future_steps: JourneyStep[]
  pain_points: string[]
  gains: string[]
}

export interface KPICard {
  label: string
  value: string
  trend: string | null
  unit: string | null
}

export interface ChartSpec {
  chart_type: 'bar' | 'line' | 'pie' | 'area' | 'table'
  title: string
  description: string
  sample_data: Record<string, unknown>[]
}

export interface DashboardData {
  title: string
  subtitle: string
  kpi_cards: KPICard[]
  charts: ChartSpec[]
}

export interface DataRequirement {
  source: string
  type: string
  availability: 'available' | 'needs_work' | 'missing'
}

export interface Metric {
  name: string
  baseline: string
  target: string
  timeframe: string
}

export interface ROIModel {
  investment_range: string
  annual_benefit: string
  payback_period: string
}

export interface Risk {
  description: string
  severity: 'Low' | 'Medium' | 'High'
  mitigation: string
}

export interface ImpactCanvasData {
  problem_statement: string
  solution_overview: string
  data_required: DataRequirement[]
  key_metrics: Metric[]
  estimated_roi: ROIModel
  top_risks: Risk[]
}

export interface PipelineNode {
  id: string
  label: string
  type: 'source' | 'ingest' | 'transform' | 'model' | 'output' | 'consumer'
  description: string
}

export interface PipelineEdge {
  from_id: string
  to_id: string
  label: string | null
}

export interface PipelineData {
  nodes: PipelineNode[]
  edges: PipelineEdge[]
}

export interface RepresentationOutput {
  primary_type: RepType
  secondary_types: RepType[]
  journey_map: JourneyMapData | null
  dashboard: DashboardData | null
  impact_canvas: ImpactCanvasData | null
  pipeline: PipelineData | null
  narration_script: string
}

export interface Stage2Result {
  stage2_id: string
  status: 'generating' | 'complete' | 'failed'
  use_case_id: string
  recommended_use_case_id: string | null
  discussion_reasoning: string | null
  representation_type: RepType | null
  representation: RepresentationOutput | null
}

export interface Annotation {
  id: string
  element_key: string
  comment: string
  created_at: string
}
