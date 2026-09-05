/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { WORKSHOP_STAGES } from '../workshopStages';

interface Page1WelcomeProps {
  onStart: () => void;
}

export const Page1Welcome: React.FC<Page1WelcomeProps> = ({ onStart }) => {
  return (
    <div className="max-w-2xl mx-auto py-16 px-6 flex flex-col items-center text-center">
      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-6">
        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
        <span>Strategy Unbounded Agent</span>
      </div>

      {/* Main Title */}
      <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight font-serif-title mb-4 leading-tight">
        Strategy Unbounded
      </h1>

      {/* Single Sentence Subtitle */}
      <p className="text-lg sm:text-xl text-slate-600 font-normal max-w-lg mb-10 leading-relaxed">
        Explore opportunities, challenge assumptions, and make a better strategic decision with AI.
      </p>

      {/* Primary Action Button */}
      <button
        onClick={onStart}
        id="start-workshop-btn"
        className="px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold text-base shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-3 cursor-pointer group"
      >
        <span>Start Exercise</span>
        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
      </button>

      {/* Three-stage research framework */}
      <div className="mt-14 pt-8 border-t border-slate-200 w-full max-w-2xl">
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block mb-3">
          Exercise Journey
        </span>
        <div className="grid sm:grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch gap-3 text-left">
          {WORKSHOP_STAGES.map((stage, index) => (
            <React.Fragment key={stage.id}>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <span className="text-xs text-indigo-600 font-black uppercase tracking-wider">{stage.label}</span>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{stage.purpose}</p>
              </div>
              {index < WORKSHOP_STAGES.length - 1 && <span className="self-center text-slate-300 text-lg text-center">→</span>}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
