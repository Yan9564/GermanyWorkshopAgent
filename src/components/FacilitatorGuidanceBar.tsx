/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Compass,
  ArrowRight,
  ShieldAlert,
  Info,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Bot,
} from 'lucide-react';
import { FacilitatorGuidance, WorkshopStageId } from '../types';
import { STAGE_GUIDANCE } from '../data/defaultData';

interface FacilitatorGuidanceBarProps {
  stageId: WorkshopStageId;
  onOpenChat?: () => void;
}

export const FacilitatorGuidanceBar: React.FC<FacilitatorGuidanceBarProps> = ({
  stageId,
  onOpenChat,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const guidance: FacilitatorGuidance = STAGE_GUIDANCE[stageId] || STAGE_GUIDANCE[1];

  const isBoardMode = stageId === 5;

  if (stageId === 0) return null;

  return (
    <aside
      id={`facilitator-guidance-bar-stage-${stageId}`}
      aria-label="Facilitator Guidance"
      className={`rounded-2xl border transition-all duration-300 mb-6 overflow-hidden shadow-sm ${
        isBoardMode
          ? 'bg-slate-900/90 border-amber-500/40 text-slate-100 ring-1 ring-amber-500/20'
          : 'bg-slate-900/80 border-slate-800 text-slate-100'
      }`}
    >
      {/* Header bar */}
      <div className="px-5 py-3.5 flex items-center justify-between gap-3 border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
              isBoardMode
                ? 'bg-amber-500 text-slate-950'
                : 'bg-indigo-600 text-white'
            }`}
          >
            {isBoardMode ? <ShieldAlert className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                AI Facilitator:
              </span>
              <span
                className={`text-xs font-semibold ${
                  isBoardMode ? 'text-amber-300' : 'text-indigo-400'
                }`}
              >
                {guidance.role}
              </span>
            </div>
            <p className="text-sm font-semibold text-white">
              {guidance.whereYouAre}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenChat && (
            <button
              onClick={onOpenChat}
              id="guidance-ask-facilitator-btn"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Ask Facilitator</span>
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            id="guidance-toggle-collapse-btn"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label={isExpanded ? 'Collapse guidance' : 'Expand guidance'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Content Grid */}
      {isExpanded && (
        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs leading-relaxed">
          {/* Box 1: What to do */}
          <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-slate-400 font-semibold mb-1.5 uppercase tracking-wider text-[11px]">
                <Compass className="w-3.5 h-3.5 text-indigo-400" />
                <span>What you should do</span>
              </div>
              <p className="text-slate-200 font-medium">{guidance.whatYouShouldDo}</p>
            </div>
          </div>

          {/* Box 2: What input is expected */}
          <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-slate-400 font-semibold mb-1.5 uppercase tracking-wider text-[11px]">
                <Info className="w-3.5 h-3.5 text-amber-400" />
                <span>What input is expected</span>
              </div>
              <p className="text-slate-200 font-medium">{guidance.whatInputIsExpected}</p>
            </div>
          </div>

          {/* Box 3: What happens next */}
          <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-slate-400 font-semibold mb-1.5 uppercase tracking-wider text-[11px]">
                <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                <span>What happens next</span>
              </div>
              <p className="text-slate-200 font-medium">{guidance.whatHappensNext}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
