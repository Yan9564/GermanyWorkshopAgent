import type { AIOpportunity, AIExplorationOutput, HumanDiscussionData, WorkshopContext } from './types';

const compact = (value?: string, fallback = '') =>
  (value || fallback).replace(/\s+/g, ' ').trim().replace(/[.!?]+$/, '');

const shortLabel = (value: string) => {
  const words = compact(value).split(' ').filter(Boolean).slice(0, 7);
  return words.length ? words.join(' ') : 'the stated objective';
};

const hash = (value: string) => {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(36);
};

/**
 * Builds a context-sensitive shortlist when an AI provider is unavailable. This is
 * intentionally generated from the current Search inputs rather than copied from
 * the demo opportunity catalogue.
 */
export const buildDynamicOpportunityShortlist = (
  discussion: HumanDiscussionData,
  context: Partial<WorkshopContext> = {},
): AIExplorationOutput => {
  const rawInputs = [
    ...(discussion.challenges || []),
    ...(discussion.initialAIIdeas || []),
    ...(discussion.rawTextNotes ? discussion.rawTextNotes.split('\n') : []),
  ].map((value) => compact(value)).filter(Boolean);
  const challenges = [...new Set(rawInputs)];
  const objective = compact(context.objective || context.workshopObjective, 'the exercise objective');
  const process = compact(context.processScope, 'the process in scope');
  const organization = compact(context.organization, 'the organisation');
  const focusInputs = challenges.length ? challenges : [objective, process];
  const signature = hash(JSON.stringify({ context, rawInputs }));

  const patterns = [
    ['Early-Signal Radar', 'detect emerging patterns and provide timely, evidence-linked alerts', 'anomaly detection and semantic signal classification'],
    ['Decision Intelligence Workspace', 'compare options, trade-offs, and likely outcomes before a decision is made', 'scenario modelling with retrieval-augmented generation'],
    ['Knowledge Discovery Assistant', 'make relevant organisational knowledge easier to find, connect, and apply', 'semantic search and a governed knowledge graph'],
    ['Workflow Copilot', 'reduce repetitive work while keeping accountable people in control', 'task-oriented language models with human approval gates'],
    ['Demand and Capacity Forecaster', 'anticipate changing needs and align resources earlier', 'time-series forecasting and probabilistic modelling'],
    ['Stakeholder Experience Navigator', 'identify unmet needs and tailor clear, consistent support', 'journey analytics, clustering, and assisted content generation'],
    ['Quality and Risk Sentinel', 'surface exceptions, inconsistencies, and potential risks for review', 'classification, rules, and explainable anomaly detection'],
    ['Outcome Learning Loop', 'measure results, learn from feedback, and recommend continuous improvements', 'causal analysis and adaptive recommendation models'],
  ] as const;

  const opportunities: AIOpportunity[] = patterns.map(([title, impact, technique], index) => {
    const challenge = focusInputs[index % focusInputs.length];
    const label = shortLabel(challenge);
    const isTopPriority = index < 3;
    return {
      id: `opp-${signature}-${index + 1}`,
      number: String(index + 1).padStart(2, '0'),
      name: `${title}: ${label}`,
      challengesAddressed: [challenge],
      whyNow: 'Recent advances in accessible AI and data tooling make a focused, testable pilot practical.',
      aiUseCase: `${technique} applied to ${label}.`,
      strategicOpportunity: `Help ${organization} ${impact}, supporting ${objective}.`,
      executionApproach: `Start with a bounded pilot in ${process}; validate outputs with relevant users before expanding.`,
      requiredProprietaryData: `Relevant records, decisions, feedback, and outcome measures for ${label}.`,
      relevantPublicData: 'Applicable public benchmarks, research, standards, and open datasets where useful.',
      relevantStakeholders: compact(context.stakeholders, 'Process owners, users, decision-makers, and technology/data teams'),
      keyAssumption: `Sufficient representative evidence exists to evaluate whether this approach improves ${label}.`,
      potentialValue: `Improved decision quality, speed, consistency, or experience in relation to ${label}.`,
      cost: index < 3 ? '$' : index < 6 ? '$$' : '$$$',
      timeline: index < 3 ? '<5 days' : index < 6 ? '<5 weeks' : '<5 months',
      priorityTier: isTopPriority ? 'High' : index < 6 ? 'Medium' : 'Low',
      isTopPriority,
      ...(isTopPriority ? {
        top3Ranking: index + 1,
        prioritizationRationale: `Ranks highly for its direct connection to ${label} and its suitability for rapid validation.`,
      } : {}),
      source: 'ai' as const,
    };
  });

  return {
    challengeAssessment: {
      strategicSignificance: `The current Search inputs highlight ${shortLabel(focusInputs[0])} as a meaningful area for exploration.`,
      impactNext2To3Years: `Progress could materially support ${objective} over the next two to three years.`,
      urgencyAndLikelihood: 'Urgency and likelihood should be validated with stakeholders using available evidence.',
      crossEcosystemDependencies: `Dependencies should be mapped across ${process}, its users, data, technology, and governance.`,
      keyAssumptionsOrOverlaps: 'The shortlist assumes the notes reflect the current priorities and that relevant data and stakeholder access can be assessed.',
    },
    opportunities,
    top3Priorities: opportunities.slice(0, 3).map((opportunity, index) => ({
      rank: index + 1,
      opportunityId: opportunity.id,
      name: opportunity.name,
      rationale: opportunity.prioritizationRationale || '',
    })),
    prioritisationOverview: `Eight opportunities were generated from the current exercise context and ${challenges.length || 1} Search input${challenges.length === 1 ? '' : 's'}, then ranked for relevance and testability.`,
    generatedAt: Date.now(),
  };
};
