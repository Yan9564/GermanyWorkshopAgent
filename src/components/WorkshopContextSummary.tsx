/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Building2, Pencil } from 'lucide-react';
import { WorkshopContext } from '../types';

interface WorkshopContextSummaryProps {
  context: WorkshopContext;
  onEdit: () => void;
}

export const WorkshopContextSummary: React.FC<WorkshopContextSummaryProps> = ({ context, onEdit }) => {
  const items = [
    ['Company', context.organization],
    ['Strategic Business Priority', context.strategicPriorities],
    ['Objective', context.workshopObjective || context.objective],
    ['Process', context.processScope],
  ].filter((item): item is [string, string] => Boolean(item[1]?.trim()));

  return (
    <div className="max-w-4xl mx-auto w-full px-6 pt-5">
      <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl px-4 py-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-800 mb-1.5">
            <Building2 className="w-3.5 h-3.5" /> Exercise Context
          </div>
          {items.length > 0 ? (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
              {items.map(([label, value]) => <span key={label}><strong>{label}:</strong> {value}</span>)}
            </div>
          ) : (
            <p className="text-[11px] text-slate-500">No context provided. The exercise can continue with participant input.</p>
          )}
        </div>
        <button onClick={onEdit} className="shrink-0 text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1">
          <Pencil className="w-3 h-3" /> Edit
        </button>
      </div>
    </div>
  );
};
