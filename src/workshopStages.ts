export type MainStage = 'search' | 'representation' | 'aggregation';

export interface MainStageDefinition {
  id: MainStage;
  label: string;
  purpose: string;
  steps: readonly { id: number; code: string; label: string }[];
}

/**
 * User-facing source of truth for the three-stage research framework.
 * Numeric step IDs are retained only to migrate saved sessions and route the
 * existing page components without disrupting workshop data.
 */
export const WORKSHOP_STAGES: readonly MainStageDefinition[] = [
  {
    id: 'search',
    label: 'Search',
    purpose: 'Broaden the search space and identify strategic AI opportunities.',
    steps: [
      { id: 2, code: '1A', label: 'Prepare Context' },
      { id: 2, code: '1B', label: 'Identify Challenges' },
      { id: 3, code: '1C', label: 'Explore AI Opportunities' },
    ],
  },
  {
    id: 'representation',
    label: 'Representation',
    purpose: 'Make selected opportunities concrete and examine how they could work.',
    steps: [{ id: 4, code: '2A', label: 'Examine Opportunities' }],
  },
  {
    id: 'aggregation',
    label: 'Aggregation',
    purpose: 'Challenge, prioritize, and converge on strategic decisions.',
    steps: [
      { id: 4, code: '3A', label: 'Review & Prioritize' },
      { id: 5, code: '3B', label: 'Stress Test' },
      { id: 6, code: '3C', label: 'Final Decision' },
    ],
  },
] as const;

export const getMainStageForStep = (step: number): MainStage => {
  if (step <= 3) return 'search';
  if (step === 4) return 'representation';
  return 'aggregation';
};

export const getStageDefinition = (step: number) =>
  WORKSHOP_STAGES.find((stage) => stage.id === getMainStageForStep(step))!;

export const getStageEntryStep = (stage: MainStage) =>
  ({ search: 2, representation: 4, aggregation: 5 })[stage];

export const getSubstepForStep = (step: number) => {
  if (step === 2) return { code: '1B', label: 'Identify Challenges' };
  if (step === 3) return { code: '1C', label: 'Explore AI Opportunities' };
  if (step === 4) return { code: '2A', label: 'Examine Opportunities' };
  if (step === 5) return { code: '3B', label: 'Stress Test' };
  return { code: '3C', label: 'Final Decision' };
};
