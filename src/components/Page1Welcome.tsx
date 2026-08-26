/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

interface Page1WelcomeProps {
  onStart: () => void;
}

export const Page1Welcome: React.FC<Page1WelcomeProps> = ({ onStart }) => {
  return (
    <div className="max-w-2xl mx-auto py-16 px-6 flex flex-col items-center text-center">
      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-6">
        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
        <span>AI-Guided Strategy Workshop</span>
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
        <span>Start Workshop</span>
        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
      </button>

      {/* Subtle Step Journey */}
      <div className="mt-16 pt-8 border-t border-slate-200 w-full max-w-md">
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block mb-3">
          Workshop Journey
        </span>
        <div className="flex items-center justify-between text-xs font-medium text-slate-500">
          <span className="text-indigo-600 font-bold">Think</span>
          <span className="text-slate-300">→</span>
          <span>Explore</span>
          <span className="text-slate-300">→</span>
          <span>Review</span>
          <span className="text-slate-300">→</span>
          <span>Challenge</span>
          <span className="text-slate-300">→</span>
          <span>Decide</span>
        </div>
      </div>
    </div>
  );
};
