/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Flame,
  ArrowRight,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  ShieldX,
  FileCheck,
  Gavel,
} from 'lucide-react';
import {
  BoardChallengeOutput,
  RevisedPrioritiesOutput,
  SafeguardSufficiency,
} from '../types';

interface Stage5BoardChallengeProps {
  revisedPriorities: RevisedPrioritiesOutput;
  boardChallenge: BoardChallengeOutput | null;
  isLoading: boolean;
  onRunChallenge: () => void;
  onContinue: () => void;
}

export const Stage5BoardChallenge: React.FC<Stage5BoardChallengeProps> = ({
  revisedPriorities,
  boardChallenge,
  isLoading,
  onRunChallenge,
  onContinue,
}) => {
  const getSafeguardBadge = (status: SafeguardSufficiency) => {
    switch (status) {
      case 'SUFFICIENT':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            Safeguards Sufficient
          </span>
        );
      case 'PARTIALLY_SUFFICIENT':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5" />
            Partially Sufficient (Gaps Exist)
          </span>
        );
      case 'MATERIALLY_INSUFFICIENT':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase px-2.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <ShieldX className="w-3.5 h-3.5" />
            Materially Insufficient
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8" id="stage-5-board-challenge">
      {/* Board Mode Dramatic Header */}
      <div className="bg-slate-950 border-2 border-amber-500/50 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-amber-500/20 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-lg">
              <Gavel className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-amber-400 block mb-0.5">
                Stage 5 of 6 — Critical Stress-Testing
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Board Challenge Mode
              </h2>
            </div>
          </div>

          <div className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-amber-950/60 text-amber-200 border border-amber-500/40 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Simulated Fortune 500 Risk Committee</span>
          </div>
        </div>

        {/* The Board's Mandate Statement */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-amber-500/30 text-slate-200 text-sm sm:text-base font-serif-title leading-relaxed mb-6 italic">
          “Your priorities are now established. I will switch roles and stress-test your reasoning as a critical Board-level challenger. I will not replace your priorities or offer new ideas; I will expose your blind spots, behavioral risks, and execution failure mechanisms before capital is committed.”
        </div>

        {/* Committee Verdict if generated */}
        {boardChallenge && (
          <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
              Lead Independent Director's Preliminary Verdict:
            </span>
            <p className="text-xs sm:text-sm text-amber-100/90 font-medium leading-relaxed">
              {boardChallenge.executiveCommitteeVerdict}
            </p>
          </div>
        )}

        {/* Generate / Re-run Board Challenge Button */}
        {!boardChallenge && (
          <div className="flex justify-center pt-2">
            <button
              onClick={onRunChallenge}
              id="stage5-run-challenge-btn"
              disabled={isLoading}
              className="px-6 py-3.5 rounded-xl text-sm font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 shadow-xl shadow-amber-500/20 transition-all flex items-center gap-2"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-slate-950" />
              )}
              <span>Initiate Board Stress-Test on 3 Priorities</span>
            </button>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="p-12 text-center bg-slate-900/80 border border-amber-500/30 rounded-2xl animate-pulse">
          <ShieldAlert className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">
            Conducting Board Stress-Test...
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Analyzing behavioral biases, operational failure mechanisms, automation over-reliance, and downside worst-case scenarios.
          </p>
        </div>
      )}

      {/* Deep Board Stress-Test Cards */}
      {boardChallenge && !isLoading && (
        <div className="space-y-6">
          {boardChallenge.prioritiesChallenged.map((item, idx) => (
            <div
              key={idx}
              className="bg-slate-900/90 border border-amber-500/30 hover:border-amber-500/60 rounded-2xl p-6 shadow-xl transition-all space-y-5"
            >
              {/* Priority Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center">
                    #{item.priorityRank}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    {item.priorityName}
                  </h3>
                </div>

                <div>
                  {getSafeguardBadge(item.governanceAndRisk.safeguardSufficiency)}
                </div>
              </div>

              {/* Section A: Execution Friction (3 Specific Failure Points) */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="flex items-center gap-2 mb-3">
                  <Flame className="w-4 h-4 text-rose-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-300">
                    A. Execution Friction — Three Concrete Failure Mechanisms
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
                    <div>
                      <span className="font-bold text-rose-400 block mb-1 text-[11px]">
                        1. Data Integrity & Incentives:
                      </span>
                      <p className="text-slate-300 leading-relaxed">
                        {item.executionFriction.failurePoint1}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
                    <div>
                      <span className="font-bold text-rose-400 block mb-1 text-[11px]">
                        2. Behavioral & Automation Bias:
                      </span>
                      <p className="text-slate-300 leading-relaxed">
                        {item.executionFriction.failurePoint2}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
                    <div>
                      <span className="font-bold text-rose-400 block mb-1 text-[11px]">
                        3. Organizational & Process Friction:
                      </span>
                      <p className="text-slate-300 leading-relaxed">
                        {item.executionFriction.failurePoint3}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section B: Governance, Risk & Downside Protection */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-amber-500/20 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                    B. Governance, Risk & Downside Protection
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="font-bold text-slate-400 block mb-1 uppercase text-[10px]">
                      Realistic Material Worst-Case Scenario:
                    </span>
                    <p className="text-amber-100 font-medium leading-relaxed">
                      “{item.governanceAndRisk.materialWorstCaseScenario}”
                    </p>
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-900/80 border border-amber-500/30">
                    <span className="font-bold text-amber-400 block mb-1 uppercase text-[10px]">
                      Single Most Important Remaining Gap:
                    </span>
                    <p className="text-slate-200 font-medium leading-relaxed">
                      {item.governanceAndRisk.singleMostImportantRemainingGap}
                    </p>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 italic">
                  Board Safeguard Evaluation: {item.governanceAndRisk.safeguardReasoning}
                </p>
              </div>
            </div>
          ))}

          {/* Board Governance Directives */}
          {boardChallenge.boardRecommendations && boardChallenge.boardRecommendations.length > 0 && (
            <div className="p-5 rounded-2xl bg-slate-950 border border-amber-500/40 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <FileCheck className="w-4 h-4" />
                Board Pre-Conditions for Capital Allocation & Deployment:
              </span>
              <ul className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-200">
                {boardChallenge.boardRecommendations.map((rec, i) => (
                  <li key={i} className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <strong className="text-amber-300 block mb-1">Pre-Condition {i + 1}:</strong>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Continue to Final Decision Button */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-300">
              <span className="font-bold text-white block mb-0.5">
                Stress-Test Review Complete
              </span>
              <p className="text-slate-400">
                In Stage 6, executive decision authority returns to your team to confirm the final strategic priorities and adopted safeguards.
              </p>
            </div>

            <button
              onClick={onContinue}
              id="stage5-proceed-decide-btn"
              className="px-6 py-3.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 shrink-0 group"
            >
              <span>Continue to Stage 6 (Make Your Decision)</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
