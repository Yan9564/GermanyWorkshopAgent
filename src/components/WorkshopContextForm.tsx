/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ArrowRight, Building2, CheckCircle2 } from 'lucide-react';
import { WorkshopContext } from '../types';

interface WorkshopContextFormProps {
  initialContext: WorkshopContext;
  onSave: (context: WorkshopContext) => void;
  onCancel?: () => void;
}

const shortFields: { key: keyof WorkshopContext; label: string; placeholder: string }[] = [
  { key: 'organization', label: 'Organization / Company', placeholder: 'Example: Acme Manufacturing' },
  { key: 'industry', label: 'Industry / Sector', placeholder: 'Example: Industrial manufacturing' },
  { key: 'businessUnit', label: 'Business Unit / Function', placeholder: 'Example: Global supply chain' },
  { key: 'workshopTopic', label: 'Workshop Topic', placeholder: 'What are you exploring?' },
];

const longFields: { key: keyof WorkshopContext; label: string; placeholder: string }[] = [
  { key: 'workshopObjective', label: 'Workshop Objective', placeholder: 'What should this workshop help the group decide or achieve?' },
  { key: 'processScope', label: 'Process / Workflow in Scope', placeholder: 'Which process, service, workflow, or decision is in scope?' },
  { key: 'stakeholders', label: 'Key Stakeholders / Users', placeholder: 'Who uses, owns, or is affected by this process?' },
  { key: 'currentChallenges', label: 'Current Challenges or Pain Points', placeholder: 'Known pain points or uncertainties (optional—the Search stage will develop these).' },
  { key: 'strategicPriorities', label: 'Strategic Priorities', placeholder: 'Relevant goals, outcomes, or strategic commitments.' },
  { key: 'constraints', label: 'Constraints', placeholder: 'Budget, timing, policy, technology, data, or operating constraints.' },
];

export const WorkshopContextForm: React.FC<WorkshopContextFormProps> = ({
  initialContext,
  onSave,
  onCancel,
}) => {
  const [context, setContext] = useState<WorkshopContext>(initialContext);

  const update = (key: keyof WorkshopContext, value: string) => {
    setContext((current) => ({ ...current, [key]: value }));
  };

  const handleSave = () => {
    const topic = context.workshopTopic?.trim() || context.title?.trim() || '';
    const objective = context.workshopObjective?.trim() || context.objective?.trim() || '';
    onSave({
      ...context,
      title: topic,
      objective,
      workshopTopic: topic,
      workshopObjective: objective,
    });
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-6 w-full">
      <div className="text-center mb-7">
        <div className="w-11 h-11 mx-auto mb-3 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
          <Building2 className="w-5 h-5" />
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 font-mono block mb-2">
          Search Preparation • Sub-step 1A
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-serif-title mb-2">
          Workshop Context
        </h1>
        <p className="text-sm text-slate-500 max-w-2xl mx-auto">
          Provide relevant organizational, business, process, and workshop context so the AI can generate more relevant challenges and opportunities. All fields are optional.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-sm space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {shortFields.map((field) => (
            <label key={field.key} className="space-y-1.5">
              <span className="text-xs font-bold text-slate-700">{field.label}</span>
              <input
                value={String(context[field.key] || '')}
                onChange={(event) => update(field.key, event.target.value)}
                placeholder={field.placeholder}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
              />
            </label>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {longFields.map((field) => (
            <label key={field.key} className="space-y-1.5">
              <span className="text-xs font-bold text-slate-700">{field.label}</span>
              <textarea
                value={String(context[field.key] || '')}
                onChange={(event) => update(field.key, event.target.value)}
                placeholder={field.placeholder}
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm leading-relaxed resize-y"
              />
            </label>
          ))}
        </div>

        <label className="space-y-1.5 block pt-1 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-700">Additional Context</span>
          <textarea
            value={context.additionalContext || ''}
            onChange={(event) => update('additionalContext', event.target.value)}
            placeholder="Describe the organization, process, strategic challenge, or any other relevant background information for this workshop."
            rows={5}
            className="w-full px-3.5 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm leading-relaxed resize-y"
          />
        </label>
      </div>

      <div className="pt-6 flex flex-col-reverse sm:flex-row justify-end gap-2">
        {onCancel && (
          <button onClick={onCancel} className="px-5 py-3 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-white">
            Cancel
          </button>
        )}
        <button
          id="save-workshop-context-btn"
          onClick={handleSave}
          className="px-7 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Save Context &amp; Continue</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
