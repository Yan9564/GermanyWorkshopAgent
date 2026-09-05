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
  Edit2,
  Trash2,
  Plus,
  ArrowUp,
  ArrowDown,
  MessageSquare,
} from 'lucide-react';
import { AIOpportunity, ReviewDecision, WorkshopInteractionInput } from '../types';
import { createResearchId } from '../researchLog';
import { downloadLongList } from '../longList';

interface Page4ExploreOpportunitiesProps {
  opportunities: AIOpportunity[];
  onConfirmTop3: (reviewedDecisions: Record<string, ReviewDecision>) => void;
  isSubmitting?: boolean;
  initialReviews?: Record<string, ReviewDecision>;
  onReviewsChange: (reviews: Record<string, ReviewDecision>) => void;
  onOpportunitiesChange: (opportunities: AIOpportunity[]) => void;
  onInteraction: (event: WorkshopInteractionInput) => void;
  longList?: AIOpportunity[];
}

export const Page4ExploreOpportunities: React.FC<Page4ExploreOpportunitiesProps> = ({
  opportunities,
  onConfirmTop3,
  isSubmitting = false,
  initialReviews = {},
  onReviewsChange,
  onOpportunitiesChange,
  onInteraction,
  longList = [],
}) => {
  const [items, setItems] = useState<AIOpportunity[]>(opportunities);
  const [reviews, setReviews] = useState<Record<string, ReviewDecision>>(initialReviews);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<AIOpportunity | null>(null);
  const [resonance, setResonance] = useState<'yes' | 'partly' | 'no' | ''>('');
  const [feedback, setFeedback] = useState('');

  const handleDecision = (id: string, decision: ReviewDecision) => {
    const previous = reviews[id]?.toLowerCase() || 'unclassified';
    const next = { ...reviews, [id]: decision };
    setReviews(next);
    onReviewsChange(next);
    onInteraction({
      stage: 'aggregation', subStep: '3A', actionType: decision.toLowerCase() as Lowercase<ReviewDecision>,
      entityType: 'opportunity', entityId: id, originalValue: previous,
      newValue: decision.toLowerCase(),
    });
  };

  const commitItems = (next: AIOpportunity[]) => {
    setItems(next);
    onOpportunitiesChange(next);
  };

  const startEdit = (opportunity: AIOpportunity) => {
    setEditingId(opportunity.id);
    setEditDraft({ ...opportunity });
  };

  const saveEdit = (opportunity: AIOpportunity) => {
    const name = editDraft?.name.trim() || '';
    const description = editDraft?.strategicOpportunity.trim() || '';
    if (!name || !description) return;
    const revised: AIOpportunity = {
      ...opportunity, ...editDraft,
      name,
      strategicOpportunity: description,
      source: opportunity.source === 'human' ? 'human' : 'ai_edited_by_human',
      originalAIValue: opportunity.originalAIValue || { ...opportunity },
    };
    if (name !== opportunity.name || description !== opportunity.strategicOpportunity) {
      commitItems(items.map((item) => item.id === opportunity.id ? revised : item));
      onInteraction({
        stage: 'representation', subStep: '2A', actionType: 'edit', entityType: 'opportunity',
        entityId: opportunity.id, originalValue: opportunity, newValue: revised,
        metadata: { originalSource: opportunity.source || 'ai', currentSource: revised.source },
      });
    }
    setEditingId(null);
    setEditDraft(null);
  };

  const deleteOpportunity = (opportunity: AIOpportunity) => {
    commitItems(items.filter((item) => item.id !== opportunity.id));
    const nextReviews = { ...reviews };
    delete nextReviews[opportunity.id];
    setReviews(nextReviews);
    onReviewsChange(nextReviews);
    onInteraction({
      stage: 'representation', subStep: '2A', actionType: 'delete', entityType: 'opportunity',
      entityId: opportunity.id, originalValue: opportunity,
      metadata: { source: opportunity.source || 'ai' },
    });
  };

  const addOpportunity = () => {
    const id = createResearchId('opportunity');
    const added: AIOpportunity = {
      id, number: String(items.length + 1).padStart(2, '0'), name: 'New participant opportunity',
      challengesAddressed: [], whyNow: '', aiUseCase: '',
      strategicOpportunity: 'Describe the strategic opportunity.', executionApproach: '',
      requiredProprietaryData: '', relevantPublicData: '', cost: '$', timeline: '<5 weeks',
      priorityTier: 'Medium', isTopPriority: false, source: 'human',
    };
    commitItems([...items, added]);
    onInteraction({
      stage: 'representation', subStep: '2A', actionType: 'add', entityType: 'opportunity',
      entityId: id, newValue: added, metadata: { source: 'human' },
    });
    setExpandedId(id);
    startEdit(added);
  };

  const moveOpportunity = (index: number, offset: -1 | 1) => {
    const target = index + offset;
    if (target < 0 || target >= items.length) return;
    let next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    next = next.map((item, itemIndex) => ({
      ...item,
      isTopPriority: itemIndex < 3,
      top3Ranking: itemIndex < 3 ? itemIndex + 1 : undefined,
    }));
    commitItems(next);
    [items[index], items[target]].forEach((opportunity) => {
      const previousRank = items.findIndex((item) => item.id === opportunity.id) + 1;
      const newRank = next.findIndex((item) => item.id === opportunity.id) + 1;
      onInteraction({
        stage: 'aggregation', subStep: '3A', actionType: 'rank_change', entityType: 'opportunity',
        entityId: opportunity.id, originalValue: { rank: previousRank }, newValue: { rank: newRank },
      });
    });
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
          Strategy Unbounded has shortlisted {items.length} opportunities from the long list of {longList.length || 500}.
        </h1>
        <p className="text-sm text-slate-500">
          Review each AI-generated opportunity, add your own opportunities as a group if needed, and then prioritise the opportunities.
        </p>
        <p className="mt-2 text-xs text-slate-500">You can download the spreadsheet to revisit and examine the full long list.</p>
        <button type="button" disabled={!longList.length} onClick={() => downloadLongList(longList)} className="mt-3 px-4 py-2 rounded-lg bg-white border border-indigo-200 text-xs font-bold text-indigo-700 disabled:opacity-40">Download long-list spreadsheet</button>
      </div>

      {/* Opportunities List */}
      <div className="space-y-3">
        {items.map((opp, index) => {
          const rank = index + 1;
          const isTop3 = opp.isTopPriority || rank <= 3;
          const currentDecision = reviews[opp.id];
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
                      {editingId === opp.id ? (
                        <div className="space-y-2 w-full">
                          {editDraft && ([
                            ['name','Opportunity title'], ['strategicOpportunity','Description'], ['challengesAddressed','Challenge addressed'],
                            ['requiredProprietaryData','Required data'], ['aiUseCase','AI approach / expected outputs'], ['executionApproach','Implementation approach'],
                            ['potentialValue','Strategic value'], ['keyAssumption','Assumptions / risks']
                          ] as const).map(([key, label]) => (
                            <label key={key} className="block text-[10px] font-bold text-slate-600">{label}
                              <textarea value={key === 'challengesAddressed' ? editDraft.challengesAddressed.join('\n') : String(editDraft[key] || '')} onChange={(event) => setEditDraft(current => current ? ({ ...current, [key]: key === 'challengesAddressed' ? event.target.value.split('\n').filter(Boolean) : event.target.value }) : current)} rows={key === 'strategicOpportunity' ? 2 : 1} className="mt-0.5 w-full px-2.5 py-1.5 rounded-lg border border-indigo-300 text-xs" aria-label={label} />
                            </label>
                          ))}
                          <div className="flex gap-2">
                            <button onClick={() => saveEdit(opp)} className="text-[11px] font-bold text-indigo-700">Save revision</button>
                            <button onClick={() => setEditingId(null)} className="text-[11px] text-slate-500">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                          {opp.name}
                        </h3>
                      )}
                      {isTop3 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Award className="w-3 h-3 text-emerald-600" />
                          Proposed Top 3
                        </span>
                      )}
                    </div>

                    {editingId !== opp.id && (
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                        {opp.strategicOpportunity || opp.whyNow || 'High-impact AI capability addressing core operational vulnerabilities.'}
                      </p>
                    )}

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

              <div className="px-5 pb-3 flex items-center justify-end gap-1 border-t border-slate-100 pt-2">
                <button onClick={() => moveOpportunity(index, -1)} disabled={index === 0} title="Move up" className="p-1.5 text-slate-400 hover:text-indigo-700 disabled:opacity-25"><ArrowUp className="w-3.5 h-3.5" /></button>
                <button onClick={() => moveOpportunity(index, 1)} disabled={index === items.length - 1} title="Move down" className="p-1.5 text-slate-400 hover:text-indigo-700 disabled:opacity-25"><ArrowDown className="w-3.5 h-3.5" /></button>
                <button onClick={() => startEdit(opp)} title="Edit opportunity" className="p-1.5 text-slate-400 hover:text-indigo-700"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => deleteOpportunity(opp)} title="Delete opportunity" className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
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

                    {(opp.relevantStakeholders || opp.keyAssumption) && (
                      <div>
                        <span className="font-bold text-slate-900 block mb-0.5">
                          Stakeholders &amp; Key Assumption:
                        </span>
                        <p className="text-slate-600">
                          {opp.relevantStakeholders || 'Confirm accountable stakeholders'} · {opp.keyAssumption || 'Validate the operating assumptions with participants'}
                        </p>
                      </div>
                    )}

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
                        {opp.potentialValue || opp.strategicOpportunity} Output: {opp.aiUseCase}. Estimated Cost: <strong className="text-slate-900">{opp.cost}</strong> | Pilot Timeline: <strong className="text-slate-900">{opp.timeline}</strong>. Validate data access and adoption assumptions during review.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button onClick={addOpportunity} className="mt-4 text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1.5">
        <Plus className="w-3.5 h-3.5" /> Add participant opportunity
      </button>

      <div className="mt-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900">Do these opportunities resonate with your group?</h3>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {(['yes', 'partly', 'no'] as const).map((value) => (
            <button key={value} onClick={() => setResonance(value)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${resonance === value ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'}`}>
              {value === 'yes' ? 'Yes' : value === 'partly' ? 'Partly' : 'No'}
            </button>
          ))}
        </div>
        <textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} rows={2} placeholder="What would you change? (optional)" className="w-full p-3 rounded-xl border border-slate-200 text-sm resize-y" />
        <button
          disabled={!resonance && !feedback.trim()}
          onClick={() => onInteraction({
            stage: 'representation', subStep: '2A', actionType: 'feedback', entityType: 'feedback',
            newValue: { resonance: resonance || null, comment: feedback.trim() },
            metadata: { prompt: 'opportunity_resonance' },
          })}
          className="mt-2 text-xs font-bold text-indigo-700 disabled:text-slate-300"
        >
          Save feedback
        </button>
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
