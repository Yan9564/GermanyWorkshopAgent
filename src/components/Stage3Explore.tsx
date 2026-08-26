/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Brain,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Clock,
  DollarSign,
  Layers,
  Database,
  Globe,
  Filter,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Activity,
  AlertCircle,
  Maximize2,
  X,
} from 'lucide-react';
import {
  AIExplorationOutput,
  AIOpportunity,
  HumanDiscussionData,
} from '../types';

interface Stage3ExploreProps {
  humanDiscussion: HumanDiscussionData;
  exploration: AIExplorationOutput | null;
  isLoading: boolean;
  onGenerateOpportunities: () => void;
  onContinue: () => void;
}

export const Stage3Explore: React.FC<Stage3ExploreProps> = ({
  humanDiscussion,
  exploration,
  isLoading,
  onGenerateOpportunities,
  onContinue,
}) => {
  const [filterTier, setFilterTier] = useState<'ALL' | 'TOP3' | 'FAST' | 'DEEP'>('ALL');
  const [selectedOpportunity, setSelectedOpportunity] = useState<AIOpportunity | null>(null);
  const [isAssessmentExpanded, setIsAssessmentExpanded] = useState(true);

  if (!exploration && !isLoading) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12" id="stage-3-empty">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto mb-4">
          <Brain className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Ready to Explore AI Strategic Opportunities
        </h2>
        <p className="text-sm text-slate-300 max-w-xl mx-auto mb-6">
          The AI will evaluate your {humanDiscussion.challenges.length} team-confirmed vulnerabilities and synthesize 8–10 distinctive, high-impact AI opportunities with explicit Top 3 executive rankings.
        </p>

        <button
          onClick={onGenerateOpportunities}
          id="stage3-generate-btn"
          className="px-6 py-3.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-xl shadow-indigo-600/30 transition-all inline-flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>Generate AI Strategic Opportunity Landscape</span>
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16" id="stage-3-loading">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto mb-6 animate-pulse">
          <Brain className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">
          Synthesizing AI Opportunity Landscape
        </h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
          Grounded strictly in your team's confirmed vulnerabilities. Assessing cross-ecosystem dependencies and ranking Top 3 strategic priorities...
        </p>
        <div className="w-48 h-1.5 bg-slate-800 rounded-full mx-auto overflow-hidden">
          <div className="h-full bg-indigo-500 rounded-full animate-progress" />
        </div>
      </div>
    );
  }

  if (!exploration) return null;

  // Filter opportunities
  const filteredOpps = exploration.opportunities.filter(opp => {
    if (filterTier === 'TOP3') return opp.isTopPriority;
    if (filterTier === 'FAST') return opp.timeline === '<5 days';
    if (filterTier === 'DEEP') return opp.timeline === '<5 weeks' || opp.timeline === '<5 months';
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8" id="stage-3-explore">
      {/* 1. Challenge Assessment Card (Preserves human framing) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-xs">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block">
                Human-Identified Baseline
              </span>
              <h3 className="text-base font-bold text-white">
                Executive Challenge & Ecosystem Assessment
              </h3>
            </div>
          </div>

          <button
            onClick={() => setIsAssessmentExpanded(!isAssessmentExpanded)}
            id="toggle-assessment-btn"
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-medium"
          >
            <span>{isAssessmentExpanded ? 'Collapse' : 'Expand Assessment'}</span>
            {isAssessmentExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>

        {isAssessmentExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="font-bold text-slate-400 block mb-1 uppercase tracking-wider text-[10px]">
                Strategic Significance
              </span>
              <p className="text-slate-200 leading-relaxed font-medium">
                {exploration.challengeAssessment.strategicSignificance}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="font-bold text-slate-400 block mb-1 uppercase tracking-wider text-[10px]">
                Impact (2–3 Yr Horizon)
              </span>
              <p className="text-slate-200 leading-relaxed font-medium">
                {exploration.challengeAssessment.impactNext2To3Years}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="font-bold text-slate-400 block mb-1 uppercase tracking-wider text-[10px]">
                Urgency & Likelihood
              </span>
              <p className="text-slate-200 leading-relaxed font-medium">
                {exploration.challengeAssessment.urgencyAndLikelihood}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="font-bold text-slate-400 block mb-1 uppercase tracking-wider text-[10px]">
                Cross-Ecosystem Dependencies
              </span>
              <p className="text-slate-200 leading-relaxed font-medium">
                {exploration.challengeAssessment.crossEcosystemDependencies}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 2. Top 3 Strategic Priorities Hero Section */}
      <div className="bg-slate-900/90 border border-indigo-500/40 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Top 3 Recommendations
              </span>
              <span className="text-xs text-slate-400">
                Prioritized across Impact, Feasibility & Speed
              </span>
            </div>
            <h3 className="text-xl font-bold text-white">
              AI-Synthesized Strategic Priorities
            </h3>
          </div>

          <p className="text-xs text-slate-400 max-w-sm sm:text-right">
            {exploration.prioritisationOverview}
          </p>
        </div>

        {/* Top 3 Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-4">
          {exploration.top3Priorities.map(topItem => {
            const opp = exploration.opportunities.find(o => o.id === topItem.opportunityId);
            if (!opp) return null;

            return (
              <div
                key={topItem.opportunityId}
                className="bg-slate-950/80 border border-indigo-500/30 hover:border-indigo-400 rounded-2xl p-5 flex flex-col justify-between transition-all hover:shadow-lg hover:shadow-indigo-950/50 group"
              >
                <div>
                  {/* Top Rank Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-extrabold text-xs">
                        #{topItem.rank}
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        OPP-{opp.number}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-300">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
                        {opp.cost}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-300 border border-slate-700">
                        {opp.timeline}
                      </span>
                    </div>
                  </div>

                  <h4 className="text-sm sm:text-base font-bold text-white mb-2 group-hover:text-indigo-200 transition-colors">
                    {opp.name}
                  </h4>

                  <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                    {opp.strategicOpportunity}
                  </p>

                  <div className="p-2.5 rounded-lg bg-indigo-950/30 border border-indigo-500/20 mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block mb-0.5">
                      Prioritization Rationale:
                    </span>
                    <p className="text-xs text-slate-200 italic font-medium">
                      {topItem.rationale}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedOpportunity(opp)}
                  className="w-full mt-2 py-2 px-3 rounded-lg text-xs font-semibold text-indigo-300 bg-indigo-950/50 hover:bg-indigo-900/60 border border-indigo-500/30 transition-colors flex items-center justify-center gap-1"
                >
                  <span>Inspect Data & Architecture</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Complete Opportunity Landscape (8–10 Cards) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white">
              Complete Strategic Opportunity Search Space ({exploration.opportunities.length} Initiatives)
            </h3>
            <p className="text-xs text-slate-400">
              Each initiative addresses specific vulnerabilities from your team's discussion.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800">
            <button
              onClick={() => setFilterTier('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterTier === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({exploration.opportunities.length})
            </button>
            <button
              onClick={() => setFilterTier('TOP3')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterTier === 'TOP3' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Top 3 Only
            </button>
            <button
              onClick={() => setFilterTier('FAST')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterTier === 'FAST' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Rapid Win (&lt;5 Days)
            </button>
            <button
              onClick={() => setFilterTier('DEEP')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterTier === 'DEEP' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Deep Systemic (&lt;5 Wks)
            </button>
          </div>
        </div>

        {/* Opportunity Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredOpps.map(opp => (
            <div
              key={opp.id}
              className={`bg-slate-900/80 border rounded-2xl p-5 flex flex-col justify-between transition-all hover:border-slate-700 ${
                opp.isTopPriority
                  ? 'border-indigo-500/40 bg-slate-900/90'
                  : 'border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-400 px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                      {opp.number}
                    </span>
                    {opp.isTopPriority && (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Top {opp.top3Ranking}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-[11px] font-semibold">
                    <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                      Cost: {opp.cost}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                      Time: {opp.timeline}
                    </span>
                  </div>
                </div>

                <h4 className="text-sm font-bold text-white mb-2">
                  {opp.name}
                </h4>

                <div className="text-xs text-slate-300 space-y-2 mb-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Addresses Vulnerability:
                    </span>
                    <p className="text-slate-300 italic">
                      {opp.challengesAddressed.join(' · ')}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Why Now Catalyst:
                    </span>
                    <p className="text-slate-300">
                      {opp.whyNow}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      AI Role & Technique:
                    </span>
                    <p className="text-indigo-300 font-medium">
                      {opp.aiUseCase}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">
                  Approach: {opp.executionApproach}
                </span>
                <button
                  onClick={() => setSelectedOpportunity(opp)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold p-1"
                >
                  Details →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail Modal if an opportunity is clicked */}
      {selectedOpportunity && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedOpportunity(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-xs text-indigo-400 font-bold">
                OPP-{selectedOpportunity.number}
              </span>
              {selectedOpportunity.isTopPriority && (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Top Priority #{selectedOpportunity.top3Ranking}
                </span>
              )}
            </div>

            <h3 className="text-xl font-bold text-white mb-4">
              {selectedOpportunity.name}
            </h3>

            <div className="space-y-4 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Strategic Resilience Opportunity
                </span>
                <p className="text-slate-200 text-sm font-medium">
                  {selectedOpportunity.strategicOpportunity}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1 flex items-center gap-1">
                    <Database className="w-3 h-3 text-indigo-400" />
                    Required Proprietary Data
                  </span>
                  <p className="text-slate-200">
                    {selectedOpportunity.requiredProprietaryData}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1 flex items-center gap-1">
                    <Globe className="w-3 h-3 text-emerald-400" />
                    Relevant Public Data
                  </span>
                  <p className="text-slate-200">
                    {selectedOpportunity.relevantPublicData}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Execution Approach & Delivery Architecture
                </span>
                <p className="text-slate-200">
                  {selectedOpportunity.executionApproach}
                </p>
              </div>

              <div className="flex items-center gap-4 text-slate-400 pt-2">
                <span>Cost: <strong className="text-white">{selectedOpportunity.cost}</strong></span>
                <span>Timeline: <strong className="text-white">{selectedOpportunity.timeline}</strong></span>
                <span>Priority: <strong className="text-white">{selectedOpportunity.priorityTier}</strong></span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedOpportunity(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Next Step Action Banner */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-slate-300">
          <span className="font-bold text-white block mb-0.5">
            Stage 3 Exploration Complete
          </span>
          <p className="text-slate-400">
            Next, your team will evaluate these opportunities in Stage 4: Keep, Challenge, or Discard, or upload whiteboard critique.
          </p>
        </div>

        <button
          onClick={onContinue}
          id="stage3-proceed-btn"
          className="px-6 py-3 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 shrink-0 group"
        >
          <span>Continue to Stage 4 (Review & Refine)</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};
