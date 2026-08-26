/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  Layers,
  Check,
  X,
  AlertCircle,
  Upload,
  Camera,
  Edit3,
  RefreshCw,
  Sparkles,
  ArrowRight,
  MessageSquare,
  GitMerge,
  ShieldCheck,
  CheckCircle2,
  CheckSquare,
} from 'lucide-react';
import {
  AIExplorationOutput,
  HumanOpportunityReview,
  ReviewDecision,
  RevisedPrioritiesOutput,
  WhiteboardFeedbackExtraction,
  UploadedWhiteboard,
} from '../types';
import { SAMPLE_WHITEBOARD_DATA } from '../data/defaultData';

interface Stage4ReviewProps {
  exploration: AIExplorationOutput;
  reviews: Record<string, HumanOpportunityReview>;
  onUpdateReview: (reviews: Record<string, HumanOpportunityReview>) => void;
  feedbackExtraction: WhiteboardFeedbackExtraction | null;
  onUpdateFeedbackExtraction: (fb: WhiteboardFeedbackExtraction) => void;
  revisedPriorities: RevisedPrioritiesOutput | null;
  onSynthesizeRevised: () => void;
  onConfirmRevised: () => void;
  onContinue: () => void;
  isLoading: boolean;
  onExtractFeedbackImage: (imageDataUrl: string) => Promise<WhiteboardFeedbackExtraction>;
}

export const Stage4Review: React.FC<Stage4ReviewProps> = ({
  exploration,
  reviews,
  onUpdateReview,
  feedbackExtraction,
  onUpdateFeedbackExtraction,
  revisedPriorities,
  onSynthesizeRevised,
  onConfirmRevised,
  onContinue,
  isLoading,
  onExtractFeedbackImage,
}) => {
  const [feedbackImage, setFeedbackImage] = useState<string | null>(null);
  const [isEditingFeedback, setIsEditingFeedback] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Set review decision for an opportunity
  const handleDecision = (oppId: string, decision: ReviewDecision) => {
    const existing = reviews[oppId] || { opportunityId: oppId, decision: 'KEEP', comment: '' };
    onUpdateReview({
      ...reviews,
      [oppId]: {
        ...existing,
        decision,
      },
    });
  };

  // Set comment for an opportunity
  const handleComment = (oppId: string, comment: string) => {
    const existing = reviews[oppId] || { opportunityId: oppId, decision: 'KEEP', comment: '' };
    onUpdateReview({
      ...reviews,
      [oppId]: {
        ...existing,
        comment,
      },
    });
  };

  // Handle uploaded feedback image
  const handleFeedbackFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setFeedbackImage(dataUrl);
      const extracted = await onExtractFeedbackImage(dataUrl);
      onUpdateFeedbackExtraction(extracted);
    };
    reader.readAsDataURL(file);
  };

  // Load sample feedback whiteboard
  const handleLoadSampleFeedbackBoard = async () => {
    // Generate realistic feedback sticky notes SVG canvas
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 550;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 900, 550);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('EXECUTIVE FEEDBACK ON AI OPPORTUNITY LANDSCAPE', 30, 40);

      // Sticky Note 1: KEEP
      ctx.fillStyle = '#86efac';
      ctx.fillRect(30, 70, 260, 200);
      ctx.fillStyle = '#14532d';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('KEEP & ENDORSE', 45, 100);
      ctx.font = '12px sans-serif';
      ctx.fillText('• Priority 1 (Supplier Radar)', 45, 130);
      ctx.fillText('• Critical for Tier 2/3 visibility', 45, 155);
      ctx.fillText('• Validated with Procurement', 45, 180);

      // Sticky Note 2: CHALLENGE
      ctx.fillStyle = '#fca5a5';
      ctx.fillRect(310, 70, 260, 200);
      ctx.fillStyle = '#7f1d1d';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('CHALLENGE / CONCERN', 325, 100);
      ctx.font = '12px sans-serif';
      ctx.fillText('• Priority 2 (Contract AI) is too risky', 325, 130);
      ctx.fillText('• Legal team requires human override', 325, 155);
      ctx.fillText('• Cap automated reroute at $50k', 325, 180);

      // Sticky Note 3: MERGE
      ctx.fillStyle = '#fed7aa';
      ctx.fillRect(590, 70, 270, 200);
      ctx.fillStyle = '#7c2d12';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('MERGE REQUEST', 605, 100);
      ctx.font = '12px sans-serif';
      ctx.fillText('• Merge Opp 03 (BOM Graph)', 605, 130);
      ctx.fillText('  into Priority 1 Platform', 605, 155);
      ctx.fillText('• Provides single glass pane', 605, 180);

      // Banner for assumptions
      ctx.fillStyle = '#334155';
      ctx.fillRect(30, 290, 830, 220);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('NEW ASSUMPTIONS & REGULATORY MANDATES', 45, 320);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '12px sans-serif';
      ctx.fillText('1. EU CSRD regulation requires verifiable supply chain audit trail by Q3', 45, 350);
      ctx.fillText('2. Human logistics directors must retain final override for freight exceeding $50k', 45, 380);
      ctx.fillText('3. Legacy ERP migration cannot be a dependency for initial 5-week launch', 45, 410);
    }

    const dataUrl = canvas.toDataURL('image/png');
    setFeedbackImage(dataUrl);
    const extracted = await onExtractFeedbackImage(dataUrl);
    onUpdateFeedbackExtraction(extracted);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8" id="stage-4-review">
      {/* 1. Opportunity Review Matrix (Keep / Challenge / Discard) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Stage 4 of 6 — Human Evaluation
              </span>
              <h2 className="text-xl font-bold text-white">
                Review & Refine AI Opportunities
              </h2>
            </div>
          </div>

          <p className="text-xs text-slate-400">
            Mark each initiative <strong>KEEP</strong>, <strong>CHALLENGE</strong>, or <strong>DISCARD</strong> and add team notes.
          </p>
        </div>

        {/* Opportunity Review Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {exploration.opportunities.map(opp => {
            const review = reviews[opp.id] || {
              opportunityId: opp.id,
              decision: opp.isTopPriority ? 'KEEP' : 'KEEP',
              comment: '',
            };

            return (
              <div
                key={opp.id}
                className={`p-4 rounded-xl border transition-all ${
                  review.decision === 'KEEP'
                    ? 'bg-slate-950/70 border-emerald-500/40'
                    : review.decision === 'CHALLENGE'
                    ? 'bg-slate-950/70 border-amber-500/40'
                    : 'bg-slate-950/40 border-rose-500/30 opacity-70'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-400">
                      {opp.number}
                    </span>
                    <h4 className="text-xs font-bold text-white">
                      {opp.name}
                    </h4>
                  </div>

                  {opp.isTopPriority && (
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                      Top {opp.top3Ranking}
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-300 mb-3 line-clamp-2">
                  {opp.strategicOpportunity}
                </p>

                {/* Actions: KEEP / CHALLENGE / DISCARD */}
                <div className="flex items-center gap-1.5 mb-2">
                  <button
                    onClick={() => handleDecision(opp.id, 'KEEP')}
                    className={`flex-1 py-1 px-2 rounded text-[11px] font-bold transition-colors flex items-center justify-center gap-1 ${
                      review.decision === 'KEEP'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-900 text-slate-400 hover:text-emerald-300 border border-slate-800'
                    }`}
                  >
                    <Check className="w-3 h-3" />
                    <span>KEEP</span>
                  </button>

                  <button
                    onClick={() => handleDecision(opp.id, 'CHALLENGE')}
                    className={`flex-1 py-1 px-2 rounded text-[11px] font-bold transition-colors flex items-center justify-center gap-1 ${
                      review.decision === 'CHALLENGE'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-slate-900 text-slate-400 hover:text-amber-300 border border-slate-800'
                    }`}
                  >
                    <AlertCircle className="w-3 h-3" />
                    <span>CHALLENGE</span>
                  </button>

                  <button
                    onClick={() => handleDecision(opp.id, 'DISCARD')}
                    className={`flex-1 py-1 px-2 rounded text-[11px] font-bold transition-colors flex items-center justify-center gap-1 ${
                      review.decision === 'DISCARD'
                        ? 'bg-rose-700 text-white shadow-sm'
                        : 'bg-slate-900 text-slate-400 hover:text-rose-300 border border-slate-800'
                    }`}
                  >
                    <X className="w-3 h-3" />
                    <span>DISCARD</span>
                  </button>
                </div>

                {/* Comment input */}
                <input
                  type="text"
                  value={review.comment}
                  onChange={(e) => handleComment(opp.id, e.target.value)}
                  placeholder="Add executive feedback / challenge note..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Whiteboard Feedback Upload Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-slate-800 pb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 block mb-0.5">
              Multimodal Physical Feedback
            </span>
            <h3 className="text-lg font-bold text-white">
              Upload Whiteboard Critique & Sticky-Note Feedback
            </h3>
            <p className="text-xs text-slate-400">
              Snap a photo of your physical sticky-note discussions, agreements, or merge requests.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFeedbackFileChange}
              accept="image/*"
              className="hidden"
              id="feedback-file-input"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 flex items-center gap-1.5 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Feedback Photo</span>
            </button>

            <button
              onClick={handleLoadSampleFeedbackBoard}
              id="stage4-sample-feedback-btn"
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-amber-300 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-500/30 flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Sample Sticky Notes</span>
            </button>
          </div>
        </div>

        {/* Feedback Extraction Display if parsed */}
        {feedbackExtraction && (
          <div className="bg-slate-950 border border-indigo-500/30 rounded-xl p-5 mb-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold text-indigo-300">
                I interpreted your whiteboard feedback as:
              </span>
              <button
                onClick={() => setIsEditingFeedback(!isEditingFeedback)}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
              >
                <Edit3 className="w-3 h-3" />
                <span>{isEditingFeedback ? 'Done Editing' : 'Edit Interpretation'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {/* Keeps & Agreements */}
              <div className="p-3 rounded-lg bg-slate-900/60 border border-emerald-500/30">
                <span className="font-bold text-emerald-400 block mb-1.5 uppercase text-[10px]">
                  Agreements & Keeps
                </span>
                <ul className="space-y-1 text-slate-200 list-disc list-inside">
                  {feedbackExtraction.agreements.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>

              {/* Challenges & Disagreements */}
              <div className="p-3 rounded-lg bg-slate-900/60 border border-rose-500/30">
                <span className="font-bold text-rose-400 block mb-1.5 uppercase text-[10px]">
                  Challenges & Disagreements
                </span>
                <ul className="space-y-1 text-slate-200 list-disc list-inside">
                  {feedbackExtraction.challenges.concat(feedbackExtraction.disagreements).map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>

              {/* Merges & New Assumptions */}
              <div className="p-3 rounded-lg bg-slate-900/60 border border-amber-500/30">
                <span className="font-bold text-amber-400 block mb-1.5 uppercase text-[10px]">
                  Merge Requests & Assumptions
                </span>
                <ul className="space-y-1 text-slate-200 list-disc list-inside">
                  {feedbackExtraction.merges.concat(feedbackExtraction.newAssumptions).map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-500/20 text-xs flex items-center justify-between">
              <span className="text-indigo-200">
                Feedback confirmed and integrated with human reviews.
              </span>
              <button
                onClick={onSynthesizeRevised}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
              >
                Re-synthesize Revised Priorities
              </button>
            </div>
          </div>
        )}

        {/* Synthesis Action Button if not yet synthesized */}
        {!revisedPriorities && (
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-slate-300">
              Ready to merge your reviews and whiteboard feedback into revised strategic priorities?
            </span>
            <button
              onClick={onSynthesizeRevised}
              id="stage4-synthesize-btn"
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all flex items-center gap-2 shadow-md"
            >
              {isLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              )}
              <span>Synthesize Revised 3 Priorities</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Revised Priorities Evolution (Original AI -> Human Feedback -> Revised Priority) */}
      {revisedPriorities && (
        <div className="bg-slate-900/90 border border-indigo-500/50 rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block mb-0.5">
                Evolutionary Trail
              </span>
              <h3 className="text-xl font-bold text-white">
                Revised Strategic Priorities (Post-Human Refinement)
              </h3>
            </div>

            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Human Direction Applied
            </span>
          </div>

          <p className="text-xs text-slate-300 italic">
            {revisedPriorities.executiveAlignmentRationale}
          </p>

          {/* Revised Priorities Cards */}
          <div className="space-y-4">
            {revisedPriorities.revisedPriorities.map(p => (
              <div
                key={p.rank}
                className="bg-slate-950 rounded-xl border border-slate-800 p-5 space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center">
                      #{p.rank}
                    </span>
                    <h4 className="text-sm font-bold text-white">
                      {p.revisedStrategicFocus}
                    </h4>
                  </div>

                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                      p.status === 'MODIFIED'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    }`}
                  >
                    {p.status}
                  </span>
                </div>

                {/* 3-Step Evolution Chain: Original -> Feedback -> Revised */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-2 border-t border-slate-800/80">
                  <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                      1. Original AI Suggestion:
                    </span>
                    <p className="text-slate-300">{p.originalName}</p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900/60 border border-indigo-500/30">
                    <span className="text-[10px] font-bold uppercase text-indigo-400 block mb-1">
                      2. Human Feedback & Revisions:
                    </span>
                    <p className="text-indigo-200">{p.humanFeedbackSummary}</p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900/60 border border-emerald-500/30">
                    <span className="text-[10px] font-bold uppercase text-emerald-400 block mb-1">
                      3. Executive Justification:
                    </span>
                    <p className="text-emerald-200">{p.justification}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Confirm & Continue to Board Challenge */}
          <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-300">
              <span className="font-bold text-white block mb-0.5">
                Confirm Revised Priorities
              </span>
              <p className="text-slate-400">
                Once confirmed, the AI will switch roles into <strong>Board Challenge Mode</strong> to stress-test your reasoning.
              </p>
            </div>

            <button
              onClick={onContinue}
              id="stage4-proceed-challenge-btn"
              className="px-6 py-3 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 group shrink-0"
            >
              <span>Continue to Stage 5 (Board Challenge)</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
