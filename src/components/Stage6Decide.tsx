/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FileCheck2,
  ArrowUp,
  ArrowDown,
  Edit3,
  CheckCircle2,
  HelpCircle,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Plus,
  Trash2,
  Layers,
} from 'lucide-react';
import {
  BoardChallengeOutput,
  FinalHumanDecision,
  FinalStrategicPriority,
  RevisedPrioritiesOutput,
} from '../types';

interface Stage6DecideProps {
  revisedPriorities: RevisedPrioritiesOutput;
  boardChallenge: BoardChallengeOutput | null;
  initialFinalDecision: FinalHumanDecision | null;
  onSaveFinalDecision: (decision: FinalHumanDecision) => void;
  onContinueToSummary: () => void;
}

export const Stage6Decide: React.FC<Stage6DecideProps> = ({
  revisedPriorities,
  boardChallenge,
  initialFinalDecision,
  onSaveFinalDecision,
  onContinueToSummary,
}) => {
  // Initialize editable final priorities
  const [finalPriorities, setFinalPriorities] = useState<FinalStrategicPriority[]>(
    initialFinalDecision?.finalPriorities ||
      revisedPriorities.revisedPriorities.map(p => {
        const challenged = boardChallenge?.prioritiesChallenged.find(
          c => c.priorityRank === p.rank
        );
        return {
          rank: p.rank,
          name: p.revisedStrategicFocus,
          rationale: p.justification,
          safeguardsAdopted:
            challenged?.governanceAndRisk.singleMostImportantRemainingGap ||
            'Implement mandatory weekly data validation and define clear executive operational override rights.',
          timeframe: p.rank === 1 ? '<5 weeks' : p.rank === 2 ? '<5 weeks' : '<5 days',
        };
      })
  );

  const [executiveRationale, setExecutiveRationale] = useState<string>(
    initialFinalDecision?.finalExecutiveRationale ||
      'These three priorities provide an optimal balance between rapid crisis mobilization agility (<5 days), end-to-end multi-tier supplier visibility, and high-velocity freight mitigation while instituting strict human-in-the-loop spend authorizations.'
  );

  const [openQuestions, setOpenQuestions] = useState<string[]>(
    initialFinalDecision?.keyOpenQuestions || [
      'What contractual incentives will persuade strategic Tier-2 suppliers to connect to our data gateway in Q1?',
      'How will the IT and Cyber Committee accelerate ERP connector APIs without delaying core operations?',
      'Who holds final signing authority during simultaneous cyber and logistics disruption events?',
    ]
  );

  const [isSaved, setIsSaved] = useState<boolean>(!!initialFinalDecision);

  // Move priority up or down
  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= finalPriorities.length) return;

    const updated = [...finalPriorities];
    const temp = updated[index];
    updated[index] = updated[newIdx];
    updated[newIdx] = temp;

    // Recalculate rank numbers
    const reRanked = updated.map((item, i) => ({ ...item, rank: i + 1 }));
    setFinalPriorities(reRanked);
    setIsSaved(false);
  };

  // Update specific priority field
  const handleUpdateField = (
    index: number,
    field: keyof FinalStrategicPriority,
    value: string
  ) => {
    const updated = [...finalPriorities];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setFinalPriorities(updated);
    setIsSaved(false);
  };

  // Save decision
  const handleSaveDecision = () => {
    const decision: FinalHumanDecision = {
      finalPriorities,
      finalExecutiveRationale: executiveRationale,
      keyOpenQuestions: openQuestions.filter(q => q.trim().length > 0),
      confirmedAt: Date.now(),
      facilitatorSignoffNotes: 'Executive consensus confirmed. Strategic authority exercised by human committee.',
    };

    onSaveFinalDecision(decision);
    setIsSaved(true);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8" id="stage-6-decide">
      {/* Facilitator Framing Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Stage 6 of 6 — Human Judgement
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Make Your Strategic Decision
            </h2>
          </div>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed mb-4">
          The AI has provided exploration, human feedback integration, and rigorous Board-level stress testing.
          <strong> Decision authority now returns entirely to your executive leadership team.</strong>
        </p>

        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 font-medium">
          “Which priorities do you want to retain as your final strategic priorities for capital allocation and execution?”
        </div>
      </div>

      {/* Interactive Final Priority Editor (Reorder, Edit, Safeguards) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span>Final Strategic Priorities ({finalPriorities.length})</span>
            <span className="text-xs text-slate-400 font-normal">
              (Use arrows to re-rank, edit titles, and specify adopted safeguards)
            </span>
          </h3>
        </div>

        <div className="space-y-4">
          {finalPriorities.map((item, idx) => {
            return (
              <div
                key={idx}
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 font-black text-sm flex items-center justify-center">
                      #{item.rank}
                    </span>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleUpdateField(idx, 'name', e.target.value)}
                      className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-sm font-bold text-white focus:outline-none focus:border-emerald-500 w-full sm:w-[420px]"
                    />
                  </div>

                  {/* Reorder and Timeframe controls */}
                  <div className="flex items-center gap-2">
                    <select
                      value={item.timeframe}
                      onChange={(e) => handleUpdateField(idx, 'timeframe', e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none"
                    >
                      <option value="<5 days">&lt;5 days (Rapid Launch)</option>
                      <option value="<5 weeks">&lt;5 weeks (Core Platform)</option>
                      <option value="<5 months">&lt;5 months (Deep Integration)</option>
                    </select>

                    <button
                      onClick={() => handleMove(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400"
                      title="Move up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleMove(idx, 'down')}
                      disabled={idx === finalPriorities.length - 1}
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400"
                      title="Move down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Rationale and Safeguards inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Strategic Rationale
                    </label>
                    <textarea
                      value={item.rationale}
                      onChange={(e) => handleUpdateField(idx, 'rationale', e.target.value)}
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
                      Safeguards Adopted (From Board Challenge)
                    </label>
                    <textarea
                      value={item.safeguardsAdopted}
                      onChange={(e) => handleUpdateField(idx, 'safeguardsAdopted', e.target.value)}
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 resize-none"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Executive Decision Rationale & Open Questions */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
            Consensus Executive Rationale
          </label>
          <textarea
            value={executiveRationale}
            onChange={(e) => {
              setExecutiveRationale(e.target.value);
              setIsSaved(false);
            }}
            rows={3}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 resize-none"
            placeholder="Record the team's shared justification for these strategic commitments..."
          />
        </div>

        {/* Key Open Questions for Implementation */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Key Open Questions for 5-Day / 5-Week Mobilization
            </label>
            <button
              onClick={() => setOpenQuestions([...openQuestions, ''])}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Question
            </button>
          </div>

          <div className="space-y-2">
            {openQuestions.map((q, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-500">{i + 1}.</span>
                <input
                  type="text"
                  value={q}
                  onChange={(e) => {
                    const updated = [...openQuestions];
                    updated[i] = e.target.value;
                    setOpenQuestions(updated);
                    setIsSaved(false);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
                {openQuestions.length > 1 && (
                  <button
                    onClick={() => setOpenQuestions(openQuestions.filter((_, idx) => idx !== i))}
                    className="text-slate-500 hover:text-rose-400 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Save and View Final Output Brief Banner */}
      <div className="bg-slate-900/80 border border-emerald-500/30 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block mb-0.5">
            Final Human Strategic Commitment
          </span>
          <p className="text-xs text-slate-300">
            {isSaved
              ? 'Decisions saved and verified. Ready to view the complete Executive Strategy Brief.'
              : 'Save your final decisions to generate the export-ready executive documentation.'}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handleSaveDecision}
            id="stage6-save-decision-btn"
            className="flex-1 sm:flex-none px-5 py-3 rounded-xl text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{isSaved ? 'Decision Saved' : 'Save Decisions'}</span>
          </button>

          <button
            onClick={() => {
              handleSaveDecision();
              onContinueToSummary();
            }}
            id="stage6-finalize-brief-btn"
            className="flex-1 sm:flex-none px-6 py-3 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 group"
          >
            <span>Generate Executive Brief</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};
