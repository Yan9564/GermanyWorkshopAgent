/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FileText,
  Printer,
  Download,
  Share2,
  CheckCircle2,
  ShieldCheck,
  Clock,
  Database,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Layers,
  Activity,
  Award,
  Presentation,
  FileSpreadsheet,
} from 'lucide-react';
import { WorkshopSessionState } from '../types';
import { ExecutiveSlideDeckModal } from './ExecutiveSlideDeckModal';

interface Stage7ExecutiveBriefProps {
  session: WorkshopSessionState;
  onGoToStage: (stage: number) => void;
  onResetWorkshop: () => void;
}

export const Stage7ExecutiveBrief: React.FC<Stage7ExecutiveBriefProps> = ({
  session,
  onGoToStage,
  onResetWorkshop,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeView, setActiveView] = useState<'brief' | 'audit'>('brief');
  const [isSlideModalOpen, setIsSlideModalOpen] = useState(false);

  const { context, humanDiscussion, exploration, revisedPriorities, boardChallenge, finalDecision } =
    session;

  // Print handler
  const handlePrint = () => {
    window.print();
  };

  // Export Markdown handler
  const handleExportMarkdown = () => {
    const md = `# Executive Strategy Brief: ${context.title}
*Facilitated via Strategy Unbounded — AI Strategic Decision Platform*
*Date: ${new Date().toLocaleDateString()} | Session ID: ${session.id}*

## Executive Summary
${context.background}
**Core Strategic Question:** ${context.coreQuestion}

## Final Strategic Priorities
${
  finalDecision?.finalPriorities
    .map(
      (p) => `### Priority #${p.rank}: ${p.name} (${p.timeframe})
- **Strategic Rationale:** ${p.rationale}
- **Adopted Safeguards & Risk Controls:** ${p.safeguardsAdopted}
`
    )
    .join('\n') || 'No final priorities recorded.'
}

## Executive Rationale
${finalDecision?.finalExecutiveRationale || 'N/A'}

## Key Open Questions for Mobilization
${finalDecision?.keyOpenQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n') || 'N/A'}

---
## Workshop Audit Trail
- **Human Confirmed Vulnerabilities:** ${humanDiscussion.challenges.join('; ')}
- **Initial AI Ideas:** ${humanDiscussion.initialAIIdeas.join('; ')}
- **Exploration Landscape:** ${exploration?.opportunities.length || 0} initiatives generated
- **Board Stress-Test Lead Director Verdict:** ${boardChallenge?.executiveCommitteeVerdict || 'N/A'}
`;

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Strategy-Brief-${context.title.replace(/\s+/g, '-').toLowerCase()}.md`;
    a.click();
  };

  // Copy brief summary to clipboard
  const handleCopy = () => {
    const text = `Executive Strategy Brief: ${context.title}\n\nTop Priorities:\n${finalDecision?.finalPriorities
      .map((p) => `#${p.rank} ${p.name} [${p.timeframe}] - ${p.rationale}`)
      .join('\n')}\n\nRationale: ${finalDecision?.finalExecutiveRationale}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8" id="stage-7-executive-brief">
      {/* Top Action Bar (Print, Download, Share, View Toggle) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Workshop Output
            </span>
            <h2 className="text-base font-bold text-white">
              Executive Strategy Brief
            </h2>
          </div>
        </div>

        {/* View Switcher & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="p-1 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-1">
            <button
              onClick={() => setActiveView('brief')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeView === 'brief'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Executive Brief
            </button>
            <button
              onClick={() => setActiveView('audit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeView === 'audit'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Full Audit Trail
            </button>
          </div>

          <button
            onClick={() => setIsSlideModalOpen(true)}
            id="brief-open-slides-btn"
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-amber-300 bg-gradient-to-r from-amber-950/80 to-indigo-950/80 hover:from-amber-900/90 hover:to-indigo-900/90 border border-amber-500/40 shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
            title="Open and download 2-Page Executive Slides (PDF, PPTX, Images)"
          >
            <Presentation className="w-3.5 h-3.5 text-amber-400" />
            <span>2-Page Slides</span>
          </button>

          <button
            onClick={handleCopy}
            id="brief-copy-btn"
            className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors flex items-center gap-1.5"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
          </button>

          <button
            onClick={handleExportMarkdown}
            id="brief-export-md-btn"
            className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export .MD</span>
          </button>

          <button
            onClick={handlePrint}
            id="brief-print-btn"
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Brief</span>
          </button>
        </div>
      </div>

      {/* 2-PAGE EXECUTIVE SLIDES BANNER CARD */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-500/30 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0 shadow-inner">
            <Presentation className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-400">
                Presentation Suite
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/80 font-bold">
                Downloadable PDF & PPTX
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              2-Page Executive Presentation Deck
            </h3>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              Generate crisp 16:9 presentation slides formatted for Board & Executive meetings:
              <strong className="text-indigo-200"> Slide 1 (Strategic Report & Decisions)</strong> and{' '}
              <strong className="text-indigo-200"> Slide 2 (4-Pillar Resilience Architecture)</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
          <button
            onClick={() => setIsSlideModalOpen(true)}
            id="banner-open-slides-btn"
            className="w-full md:w-auto px-5 py-3 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-indigo-500/25 cursor-pointer"
          >
            <Presentation className="w-4 h-4" />
            <span>Generate & Download 2-Page Slides</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: EXECUTIVE BRIEF */}
      {activeView === 'brief' && (
        <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 text-slate-200">
          {/* Header section */}
          <div className="border-b border-slate-800 pb-6">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-mono uppercase tracking-widest text-indigo-400 font-bold">
                Strategy Unbounded Output
              </span>
              <span>{new Date().toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
              Strategic Executive Brief: {context.title}
            </h1>
            <p className="text-sm sm:text-base text-slate-300 font-medium italic">
              “{context.coreQuestion}”
            </p>
          </div>

          {/* 1. Executive Summary */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              1. Executive Summary & Strategic Context
            </h3>
            <p className="text-sm text-slate-200 leading-relaxed bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
              {context.background}
            </p>
          </div>

          {/* 2. The 3 Chosen Strategic Priorities */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                2. Final Strategic Priorities for Capital Allocation & Mobilization
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                Approved by Executive Committee
              </span>
            </div>

            <div className="space-y-4">
              {finalDecision?.finalPriorities.map((priority) => (
                <div
                  key={priority.rank}
                  className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 font-black text-sm flex items-center justify-center">
                        #{priority.rank}
                      </span>
                      <h4 className="text-base font-bold text-white">
                        {priority.name}
                      </h4>
                    </div>

                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-900 text-emerald-300 border border-slate-700 w-fit">
                      Target Horizon: {priority.timeframe}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="font-bold text-slate-400 block mb-1 uppercase text-[10px]">
                        Strategic Rationale:
                      </span>
                      <p className="text-slate-200 leading-relaxed font-medium">
                        {priority.rationale}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/60 border border-amber-500/20">
                      <span className="font-bold text-amber-400 block mb-1 uppercase text-[10px] flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Board-Approved Safeguards & Governance:
                      </span>
                      <p className="text-slate-200 leading-relaxed">
                        {priority.safeguardsAdopted}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Executive Decision Rationale */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              3. Synthesis & Strategic Alignment Rationale
            </h3>
            <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 text-xs sm:text-sm text-slate-200 leading-relaxed">
              {finalDecision?.finalExecutiveRationale}
            </div>
          </div>

          {/* 4. Open Implementation Questions */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              4. Immediate Open Questions for Management Team (Next 5 Days)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {finalDecision?.keyOpenQuestions.map((q, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex flex-col justify-between"
                >
                  <span className="font-mono text-indigo-400 font-bold mb-1">
                    0{idx + 1}.
                  </span>
                  <p>{q}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: FULL WORKSHOP AUDIT TRAIL */}
      {activeView === 'audit' && (
        <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-8">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-xl font-bold text-white">
              End-to-End Workshop Decision Audit Trail
            </h3>
            <p className="text-xs text-slate-400">
              Transparent record from human framing to AI exploration, feedback synthesis, and Board challenge.
            </p>
          </div>

          {/* Stage 2 Audit: Human Framing */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Stage 2: Human Vulnerability Baseline
              </span>
              <button
                onClick={() => onGoToStage(2)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Revisit Stage 2 →
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
              <span className="font-bold text-amber-300 block">
                Recorded Human Challenges ({humanDiscussion.challenges.length}):
              </span>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                {humanDiscussion.challenges.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Stage 3 Audit: AI Search Space */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Stage 3: AI Opportunity Search Space ({exploration?.opportunities.length || 0} items)
              </span>
              <button
                onClick={() => onGoToStage(3)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Revisit Stage 3 →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {exploration?.opportunities.map((opp) => (
                <div key={opp.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-slate-400 font-bold">{opp.number}</span>
                    <span className="text-[10px] text-slate-500">{opp.timeline} | {opp.cost}</span>
                  </div>
                  <strong className="text-white block mb-0.5">{opp.name}</strong>
                  <p className="text-slate-400 text-[11px] line-clamp-2">{opp.strategicOpportunity}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Stage 5 Audit: Board Stress Test */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Stage 5: Board Challenge Stress-Test Results
              </span>
              <button
                onClick={() => onGoToStage(5)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Revisit Stage 5 →
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 text-xs space-y-3">
              <p className="text-amber-200 font-medium">
                Lead Director Verdict: {boardChallenge?.executiveCommitteeVerdict}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
        <button
          onClick={() => onGoToStage(6)}
          id="brief-back-decide-btn"
          className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Adjust Decisions in Stage 6</span>
        </button>

        <button
          onClick={onResetWorkshop}
          id="brief-reset-workshop-btn"
          className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:text-rose-200 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/30 flex items-center gap-1.5 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Start New Workshop Session</span>
        </button>
      </div>

      {/* 2-Page Slide Deck Presentation Modal */}
      <ExecutiveSlideDeckModal
        session={session}
        isOpen={isSlideModalOpen}
        onClose={() => setIsSlideModalOpen(false)}
      />
    </div>
  );
};
