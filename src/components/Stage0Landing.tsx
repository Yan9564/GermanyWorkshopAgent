/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Layers,
  Brain,
  CheckCircle2,
  Users,
  Compass,
  FileCheck2,
} from 'lucide-react';
import { WorkshopContext } from '../types';

interface Stage0LandingProps {
  context: WorkshopContext;
  onStartWorkshop: () => void;
  onLoadDemo: () => void;
}

const WORKFLOW_STEPS = [
  { num: '01', title: 'Understand', desc: 'Case framing & strategic boundaries', icon: Compass },
  { num: '02', title: 'Discuss', desc: 'Human-only vulnerabilities & whiteboard capture', icon: Users },
  { num: '03', title: 'Explore', desc: '8-10 distinct AI opportunities & Top 3 ranking', icon: Brain },
  { num: '04', title: 'Review', desc: 'Keep / Challenge / Discard & feedback synthesis', icon: Layers },
  { num: '05', title: 'Challenge', desc: 'Board Challenge Mode: Fortune 500 stress-testing', icon: ShieldCheck },
  { num: '06', title: 'Decide', desc: 'Executive decision & audit-ready Strategy Brief', icon: FileCheck2 },
];

export const Stage0Landing: React.FC<Stage0LandingProps> = ({
  context,
  onStartWorkshop,
  onLoadDemo,
}) => {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12" id="stage-0-landing">
      {/* Hero Brand Section */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-widest mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          Multimodal AI Workshop Facilitator
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-4">
          Strategy Unbounded
        </h1>

        <p className="text-lg sm:text-xl font-semibold text-indigo-200/90 mb-3 font-serif-title">
          AI-Guided Strategic Decision Workshop
        </p>

        <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto italic font-medium">
          “Explore broadly. Challenge assumptions. Decide with judgement.”
        </p>
      </div>

      {/* Case Study Context Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 mb-10 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-5">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 block mb-1">
              Active Case Study
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {context.title}
            </h2>
          </div>
          <span className="text-xs font-medium px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            Executive C-Suite Session
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-slate-300 leading-relaxed mb-6">
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              The Strategic Challenge
            </h3>
            <p className="text-slate-300">{context.background}</p>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              The Core Inquiry
            </h3>
            <div className="p-4 rounded-xl bg-slate-950/70 border border-indigo-500/20 text-slate-100 font-medium">
              “{context.coreQuestion}”
            </div>
            <p className="text-xs text-slate-400 italic">
              {context.objective}
            </p>
          </div>
        </div>

        {/* Primary Call to Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 border-t border-slate-800">
          <p className="text-xs text-slate-400 text-center sm:text-left">
            An AI-supported executive workshop for identifying, evaluating and stress-testing strategic opportunities.
          </p>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onLoadDemo}
              id="landing-load-demo-btn"
              className="flex-1 sm:flex-none px-4 py-3 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Explore Sample Demo</span>
            </button>

            <button
              onClick={onStartWorkshop}
              id="landing-start-workshop-btn"
              className="flex-1 sm:flex-none px-6 py-3 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 hover:shadow-indigo-500/40 transition-all flex items-center justify-center gap-2 group"
            >
              <span>Start Workshop</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* Workflow Logic Architecture Breakdown */}
      <div className="mb-10">
        <div className="text-center mb-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Workshop Methodology
          </h3>
          <p className="text-sm text-slate-300 font-medium mt-1">
            Human framing → Human thinking → AI exploration → Human evaluation → AI challenge → Human judgement
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {WORKFLOW_STEPS.map(step => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between text-slate-500 text-xs font-mono mb-2">
                    <span>{step.num}</span>
                    <Icon className="w-4 h-4 text-indigo-400" />
                  </div>
                  <h4 className="text-xs font-bold text-white mb-1">
                    {step.title}
                  </h4>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Guiding Principles & Anti-Slop Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-300">
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 flex items-start gap-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-white block mb-0.5">Workflow-First AI</span>
            <p className="text-slate-400">Not an open-ended chatbot. The AI knows its exact stage role and boundaries.</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 flex items-start gap-3">
          <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-white block mb-0.5">Multimodal Input</span>
            <p className="text-slate-400">Upload photos of flipcharts, whiteboards, or sticky notes with human verification.</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 flex items-start gap-3">
          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-white block mb-0.5">Human Authority</span>
            <p className="text-slate-400">The AI challenges and structures, but the final strategic decisions remain human.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
