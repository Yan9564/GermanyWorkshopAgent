/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  ArrowRight,
  Compass,
  AlertCircle,
  Network,
  Cpu,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';
import { WorkshopContext } from '../types';

interface Stage1UnderstandProps {
  context: WorkshopContext;
  onContinue: () => void;
}

export const Stage1Understand: React.FC<Stage1UnderstandProps> = ({
  context,
  onContinue,
}) => {
  return (
    <div className="max-w-4xl mx-auto" id="stage-1-understand">
      {/* Intro Message from Facilitator */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 mb-8 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              Stage 1 of 6
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Understand the Challenge
            </h2>
          </div>
        </div>

        {/* Executive Welcome Quote */}
        <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-200 font-serif-title text-base sm:text-lg leading-relaxed mb-6 italic">
          “Welcome to Strategy Unbounded. I will guide your team through the workshop step by step. You will first develop your own view before seeing AI-generated analysis. Later, I will help you expand, refine and challenge your emerging strategy.”
        </div>

        {/* Case Framing Grid */}
        <div className="space-y-6 text-sm text-slate-300">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              The Strategic Challenge
            </h3>
            <p className="leading-relaxed text-slate-200">
              {context.background}
            </p>
          </div>

          {/* Ecosystem Choke Points */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80">
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold mb-1">
                <Network className="w-4 h-4" />
                <span>Interconnected Nodes</span>
              </div>
              <p className="text-xs text-slate-400">
                Suppliers, logistics networks, cloud platforms, and critical data infrastructure.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold mb-1">
                <AlertCircle className="w-4 h-4" />
                <span>Cascade Risk</span>
              </div>
              <p className="text-xs text-slate-400">
                Disruptions in one region or tier propagate with little warning across dependencies.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-1">
                <TrendingUp className="w-4 h-4" />
                <span>Strategic Mandate</span>
              </div>
              <p className="text-xs text-slate-400">
                Move from reactive expediting to proactive, anticipatory service continuity.
              </p>
            </div>
          </div>

          {/* The Core Question */}
          <div className="p-5 rounded-xl bg-indigo-950/30 border border-indigo-500/30">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">
              The Convening Executive Question
            </h3>
            <p className="text-base sm:text-lg font-bold text-white mb-2">
              “{context.coreQuestion}”
            </p>
            <p className="text-xs text-indigo-200/80 italic">
              {context.objective}
            </p>
          </div>
        </div>
      </div>

      {/* Facilitation Ground Rules & Bias Prevention Banner */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300">
            <span className="font-bold text-white block mb-0.5">
              Facilitation Protocol: Anti-Anchoring Guardrail
            </span>
            <p className="text-slate-400">
              At this stage, the AI strictly withholds solutions, AI opportunities, recommendations, and risk catalogs to ensure your executive group articulates unvarnished, authentic views first.
            </p>
          </div>
        </div>

        <button
          onClick={onContinue}
          id="stage1-continue-btn"
          className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition-all flex items-center justify-center gap-2 shrink-0 group"
        >
          <span>Continue to Stage 2</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};
