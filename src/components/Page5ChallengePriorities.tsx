/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ShieldAlert,
  ArrowRight,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Edit3,
} from 'lucide-react';
import { BoardChallengeOutput, RevisedPrioritiesOutput } from '../types';

interface Page5ChallengePrioritiesProps {
  boardChallenge?: BoardChallengeOutput;
  revisedPriorities?: RevisedPrioritiesOutput;
  onGenerateFinalResults: () => Promise<void>;
  isGenerating: boolean;
}

export const Page5ChallengePriorities: React.FC<Page5ChallengePrioritiesProps> = ({
  boardChallenge,
  revisedPriorities,
  onGenerateFinalResults,
  isGenerating,
}) => {
  const [wantsToEdit, setWantsToEdit] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Default concise challenges for the top 3
  const prioritiesData = [
    {
      rank: 1,
      name:
        boardChallenge?.prioritiesChallenged[0]?.priorityName ||
        revisedPriorities?.revisedPriorities[0]?.originalName ||
        'Multi-Tier Supplier Disruption Radar',
      mainChallenge:
        boardChallenge?.prioritiesChallenged[0]?.executionFriction.failurePoint1 ||
        'Tier-2 suppliers may withhold proprietary inventory status or operational halt notices until breach.',
      evidenceGap:
        boardChallenge?.prioritiesChallenged[0]?.governanceAndRisk.singleMostImportantRemainingGap ||
        'Can external ambient radar signals reliably verify factory halts 14 days before official notices?',
      judgement: 'Retain with Human Dual-Signoff',
      fullAnalysis:
        boardChallenge?.prioritiesChallenged[0]?.governanceAndRisk.safeguardReasoning ||
        'Autonomous vendor substitution carries commercial liability. Require human procurement validation.',
    },
    {
      rank: 2,
      name:
        boardChallenge?.prioritiesChallenged[1]?.priorityName ||
        revisedPriorities?.revisedPriorities[1]?.originalName ||
        'AI Dynamic Freight Rerouting & ETA Simulation',
      mainChallenge:
        boardChallenge?.prioritiesChallenged[1]?.executionFriction.failurePoint1 ||
        'Automated spot-market re-contracting may trigger compounding carrier surcharges during widespread shocks.',
      evidenceGap:
        boardChallenge?.prioritiesChallenged[1]?.governanceAndRisk.singleMostImportantRemainingGap ||
        'Will 3PL logistics partners accept dynamic SLA penalties without contractual renegotiation?',
      judgement: 'Retain with $50k Budget Threshold',
      fullAnalysis:
        boardChallenge?.prioritiesChallenged[1]?.governanceAndRisk.safeguardReasoning ||
        'Establish a $250k weekly spending ceiling and require VP approval for spot premiums exceeding $50k.',
    },
    {
      rank: 3,
      name:
        boardChallenge?.prioritiesChallenged[2]?.priorityName ||
        revisedPriorities?.revisedPriorities[2]?.originalName ||
        'Synthetic Crisis Simulator & War-Gaming Playbooks',
      mainChallenge:
        boardChallenge?.prioritiesChallenged[2]?.executionFriction.failurePoint1 ||
        'Executive teams may suffer drill fatigue if simulation scenarios disconnect from real-time ERP data.',
      evidenceGap:
        boardChallenge?.prioritiesChallenged[2]?.governanceAndRisk.singleMostImportantRemainingGap ||
        'Are cross-functional decision rights clearly mapped before crisis injections begin?',
      judgement: 'Retain (<5 Day Fast-Track)',
      fullAnalysis:
        boardChallenge?.prioritiesChallenged[2]?.governanceAndRisk.safeguardReasoning ||
        'Deploy as standalone zero-integration tabletop module in <5 days to build executive muscle memory first.',
    },
  ];

  const toggleDetails = (index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-6">
      {/* Header Task */}
      <div className="text-center mb-8">
        <span className="text-xs font-bold uppercase tracking-wider text-amber-600 font-mono block mb-2">
          Step 4 of 5 • Board & Adversarial Stress-Test
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-serif-title mb-2">
          Stress-test your Top 3
        </h1>
        <p className="text-sm text-slate-500">
          The AI challenger has identified critical failure points and evidence gaps for your proposed priorities.
        </p>
      </div>

      {/* 3 Concise Priority Cards */}
      <div className="space-y-4">
        {prioritiesData.map((item, index) => {
          const isExpanded = expandedIndex === index;

          return (
            <div
              key={index}
              className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-900 text-xs font-black flex items-center justify-center">
                    #{item.rank}
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    Priority {item.rank} — {item.name}
                  </h3>
                </div>

                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {item.judgement}
                </span>
              </div>

              {/* 3 Core Fields: Main Challenge, Evidence Gap, AI Judgement */}
              <div className="space-y-3 text-xs sm:text-sm">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wide text-amber-700 block mb-0.5">
                    Main Challenge
                  </span>
                  <p className="text-slate-700 leading-relaxed font-normal">
                    {item.mainChallenge}
                  </p>
                </div>

                <div>
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-600 block mb-0.5">
                    Evidence Gap
                  </span>
                  <p className="text-slate-700 leading-relaxed font-normal">
                    {item.evidenceGap}
                  </p>
                </div>

                {/* Progressive Disclosure: View Deeper Analysis */}
                <div>
                  <button
                    type="button"
                    onClick={() => toggleDetails(index)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 cursor-pointer pt-1"
                  >
                    <span>{isExpanded ? 'Hide deeper analysis' : 'View deeper analysis'}</span>
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="mt-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
                      <span className="font-bold text-slate-900 block">Governance Safeguard Rationale:</span>
                      <p>{item.fullAnalysis}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Decision Prompt: Change or Keep */}
      <div className="mt-8 bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900">
            Would you like to change your priorities?
          </h4>
          <p className="text-xs text-slate-500">
            Confirm the safeguards or modify priorities before generating executive slides.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setWantsToEdit(!wantsToEdit)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              wantsToEdit
                ? 'bg-slate-800 text-white'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{wantsToEdit ? 'Editing Active' : 'Edit Priorities'}</span>
          </button>

          <button
            type="button"
            onClick={() => setWantsToEdit(false)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              !wantsToEdit
                ? 'bg-indigo-50 border border-indigo-200 text-indigo-700'
                : 'bg-white border border-slate-300 text-slate-700'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Keep Current</span>
          </button>
        </div>
      </div>

      {/* Primary Action Button */}
      <div className="pt-8 flex justify-end">
        <button
          onClick={onGenerateFinalResults}
          disabled={isGenerating}
          id="generate-final-results-btn"
          className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {isGenerating ? (
            <>
              <Sparkles className="w-4 h-4 animate-spin text-indigo-200" />
              <span>Building Executive Slide Deck...</span>
            </>
          ) : (
            <>
              <span>Generate Final Results</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
