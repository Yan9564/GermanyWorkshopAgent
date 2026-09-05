import type { AIOpportunity, WorkshopContext } from './types';

/** Efficient offline/session fallback: expand grounded candidates into a broad, traceable search space. */
export const buildLongList = (base: AIOpportunity[], challenges: string[], context: WorkshopContext, count = 500) => {
  if (!base.length) return [];
  const approaches = ['prediction', 'decision support', 'knowledge retrieval', 'workflow automation', 'simulation', 'anomaly detection', 'optimisation', 'copilot'];
  return Array.from({ length: count }, (_, index) => {
    const seed = base[index % base.length];
    const challenge = challenges[index % Math.max(challenges.length, 1)] || seed.challengesAddressed[0] || context.currentChallenges || 'Participant-confirmed challenge';
    const approach = approaches[Math.floor(index / base.length) % approaches.length];
    return {
      ...seed,
      id: `long-${String(index + 1).padStart(4, '0')}`,
      number: String(index + 1).padStart(3, '0'),
      name: index < base.length ? seed.name : `${seed.name} — ${approach} variant ${Math.floor(index / base.length) + 1}`,
      challengesAddressed: [challenge],
      aiUseCase: `${approach}: ${seed.aiUseCase}`,
      isTopPriority: index < 3,
      top3Ranking: index < 3 ? index + 1 : undefined,
      source: 'ai' as const,
    };
  });
};

const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
export const downloadLongList = (items: AIOpportunity[]) => {
  const headers = ['ID','Opportunity title','Description','Challenge addressed','Strategic value','Required data','AI approach','Implementation approach','Expected outputs','Key assumptions'];
  const rows = items.map(o => [o.id,o.name,o.strategicOpportunity,o.challengesAddressed.join('; '),o.potentialValue || o.whyNow,o.requiredProprietaryData,o.aiUseCase,o.executionApproach,o.aiUseCase,o.keyAssumption || 'Validate with participants']);
  const csv = [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'application/vnd.ms-excel;charset=utf-8' }));
  link.download = 'strategy-unbounded-long-list.xlsx';
  link.click(); URL.revokeObjectURL(link.href);
};
