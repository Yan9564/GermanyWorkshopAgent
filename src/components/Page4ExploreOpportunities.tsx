/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Award,
} from 'lucide-react';
import { AIOpportunity, ReviewDecision } from '../types';

interface Page4ExploreOpportunitiesProps {
  opportunities: AIOpportunity[];
  onConfirmTop3: (reviewedDecisions: Record<string, ReviewDecision>) => void;
  isSubmitting?: boolean;
}

export const Page4ExploreOpportunities: React.FC<Page4ExploreOpportunitiesProps> = ({
  opportunities,
  onConfirmTop3,
  isSubmitting = false,
}) => {
  // Initialize reviews: Top 3 are KEEP by default
  const [reviews, setReviews] = useState<Record<string, ReviewDecision>>(() => {
    const initial: Record<string, ReviewDecision> = {};
    opportunities.forEach((opp) => {
      initial[opp.id] = opp.isTopPriority ? 'KEEP' : 'KEEP';
    });
    return initial;
  });

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleDecision = (id: string, decision: ReviewDecision) => {
    setReviews((prev) => ({
      ...prev,
      [id]: decision,
    }));
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleSubmit = () => {
    onConfirmTop3(reviews);
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-6">
      {/* Header Task */}
      <div className="text-center mb-8">
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 font-mono block mb-2">
          Representation • Sub-step 2A — Examine Opportunities
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-serif-title mb-2">
          AI found {opportunities.length} strategic opportunities
        </h1>
        <p className="text-sm text-slate-500">
          Make each use case concrete: examine its data, AI approach, implementation, outputs, value, and assumptions before reviewing it.
        </p>
      </div>

      {/* Opportunities List */}
      <div className="space-y-3">
        {opportunities.map((opp, index) => {
          const rank = index + 1;
          const isTop3 = opp.isTopPriority || rank <= 3;
          const currentDecision = reviews[opp.id] || 'KEEP';
          const isExpanded = expandedId === opp.id;

          return (
            <div
              key={opp.id}
              className={`rounded-2xl border transition-all ${
                isTop3
                  ? 'bg-white border-indigo-200 shadow-sm ring-1 ring-indigo-500/10'
                  : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Left: Rank & 1-Sentence Summary */}
                <div className="flex items-start gap-3.5 flex-1">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 mt-0.5 ${
                      isTop3
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    #{rank}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                        {opp.name}
                      </h3>
                      {isTop3 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Award className="w-3 h-3 text-emerald-600" />
                          Proposed Top 3
                        </span>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {opp.strategicOpportunity || opp.whyNow || 'High-impact AI capability addressing core operational vulnerabilities.'}
                    </p>

                    {/* Collapsible View Details Toggle */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(opp.id)}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 pt-1 cursor-pointer"
                    >
                      <span>{isExpanded ? 'Hide details' : 'View details'}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Right: Keep / Challenge / Discard Controls */}
                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0 p-1 bg-slate-50 border border-slate-200 rounded-xl">
                  <button
                    type="button"
                    onClick={() => handleDecision(opp.id, 'KEEP')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      currentDecision === 'KEEP'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Keep</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDecision(opp.id, 'CHALLENGE')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      currentDecision === 'CHALLENGE'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    <span>Challenge</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDecision(opp.id, 'DISCARD')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      currentDecision === 'DISCARD'
                        ? 'bg-slate-700 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <XCircle className="w-3 h-3" />
                    <span>Discard</span>
                  </button>
                </div>
              </div>

              {/* Collapsed Details: Progressive Disclosure */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-2 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl text-xs space-y-3 text-slate-700">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <span className="font-bold text-slate-900 block mb-0.5">
                        Challenges Addressed:
                      </span>
                      <p className="text-slate-600">
                        {opp.challengesAddressed.join(', ') || 'Identified operational vulnerabilities.'}
                      </p>
                    </div>

                    <div>
                      <span className="font-bold text-slate-900 block mb-0.5">
                        Implementation &amp; AI Approach:
                      </span>
                      <p className="text-slate-600">{opp.executionApproach}</p>
                    </div>

                    <div>
                      <span className="font-bold text-slate-900 block mb-0.5">
                        Required Data:
                      </span>
                      <p className="text-slate-600">
                        Proprietary: {opp.requiredProprietaryData} | Public: {opp.relevantPublicData}
                      </p>
                    </div>

                    <div>
                      <span className="font-bold text-slate-900 block mb-0.5">
                        Expected Value, Output &amp; Assumptions:
                      </span>
                      <p className="text-slate-600">
                        {opp.aiUseCase || opp.strategicOpportunity} Estimated Cost: <strong className="text-slate-900">{opp.cost}</strong> | Pilot Timeline: <strong className="text-slate-900">{opp.timeline}</strong>. Validate data access and adoption assumptions during review.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Primary Action Button */}
      <div className="pt-8 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          id="confirm-top3-btn"
          className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Sparkles className="w-4 h-4 animate-spin text-indigo-200" />
              <span>Preparing Stress-Test...</span>
            </>
          ) : (
            <>
              <span>Continue to Aggregation</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
