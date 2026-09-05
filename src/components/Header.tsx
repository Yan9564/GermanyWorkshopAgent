/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sparkles, RotateCcw, Compass, ArrowLeft } from 'lucide-react';
import { WORKSHOP_STAGES, getMainStageForStep, getStageEntryStep, getSubstepForStep } from '../workshopStages';

interface HeaderProps {
  currentStage: number;
  onSelectStage: (stage: number) => void;
  onReset: () => void;
  onLoadDemo?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentStage,
  onSelectStage,
  onReset,
  onLoadDemo,
}) => {
  if (currentStage === 1) return null; // Welcome page has its own minimal layout
  const activeMainStage = getMainStageForStep(currentStage);
  const activeStageIndex = WORKSHOP_STAGES.findIndex((stage) => stage.id === activeMainStage);
  const substep = getSubstepForStep(currentStage);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onSelectStage(1)}
            className="flex items-center gap-2 text-left cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm tracking-tight block leading-tight">
                Strategy Unbounded
              </span>
              <span className="text-[11px] text-slate-500 font-medium leading-tight">
                Strategy Unbounded Agent
              </span>
            </div>
          </button>
        </div>

        {/* Three-stage framework; legacy pages are shown only as secondary sub-steps. */}
        <div className="hidden md:flex flex-col items-center gap-1">
          <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200">
          {WORKSHOP_STAGES.map((stage, idx) => {
            const isActive = activeMainStage === stage.id;
            const isPassed = idx < activeStageIndex;

            return (
              <button
                key={stage.id}
                onClick={() => {
                  if (isPassed || isActive) onSelectStage(getStageEntryStep(stage.id));
                }}
                disabled={!isPassed && !isActive}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                    : isPassed
                    ? 'text-slate-700 hover:text-slate-900 cursor-pointer'
                    : 'text-slate-400 cursor-not-allowed'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : isPassed
                      ? 'bg-slate-300 text-slate-700'
                      : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  {idx + 1}
                </span>
                <span className="uppercase tracking-wide">{stage.label}</span>
              </button>
            );
          })}
          </div>
          <span className="text-[10px] font-semibold text-slate-500">
            {substep.code} · {substep.label}
          </span>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          {currentStage > 1 && (
            <button
              onClick={() => onSelectStage(currentStage - 1)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-600 flex items-center gap-1 cursor-pointer"
              title="Go back one step"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Back</span>
            </button>
          )}

          {onLoadDemo && currentStage === 2 && (
            <button
              onClick={onLoadDemo}
              className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
              title="Load sample workshop data for instant testing"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Load Sample</span>
            </button>
          )}

          <button
            onClick={onReset}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Reset Exercise Session"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
