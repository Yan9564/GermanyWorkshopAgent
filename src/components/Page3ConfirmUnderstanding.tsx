/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Check,
  Plus,
  Trash2,
  ArrowRight,
  Sparkles,
  AlertCircle,
  UploadCloud,
  Edit2,
} from 'lucide-react';
import { HumanDiscussionData } from '../types';

interface Page3ConfirmUnderstandingProps {
  initialChallenges: string[];
  initialIdeas: string[];
  uncertainties?: string[];
  onConfirm: (confirmedData: HumanDiscussionData) => Promise<void>;
  onUploadAnother: () => void;
  isProcessing: boolean;
}

export const Page3ConfirmUnderstanding: React.FC<Page3ConfirmUnderstandingProps> = ({
  initialChallenges,
  initialIdeas,
  uncertainties = [],
  onConfirm,
  onUploadAnother,
  isProcessing,
}) => {
  const [challenges, setChallenges] = useState<string[]>(
    initialChallenges.length > 0
      ? initialChallenges
      : [
          'Single-source tier-2 chip and sensor suppliers in SE Asia vulnerable to shutdown',
          'Port transshipment congestion and cross-border customs delays (3-4 weeks)',
          'Lack of real-time inventory visibility across 3PL partner warehouses',
          'Cybersecurity vulnerabilities across legacy manufacturing equipment',
        ]
  );

  const [ideas, setIdeas] = useState<string[]>(
    initialIdeas.length > 0
      ? initialIdeas
      : [
          'Multi-tier supplier disruption radar using ambient news & satellite data',
          'Dynamic freight rerouting & container ETA prediction engine',
          'Automated crisis simulation & scenario war-gaming playbooks',
        ]
  );

  const [editingChallengeIndex, setEditingChallengeIndex] = useState<number | null>(null);
  const [editingIdeaIndex, setEditingIdeaIndex] = useState<number | null>(null);
  const [newChallengeText, setNewChallengeText] = useState('');
  const [newIdeaText, setNewIdeaText] = useState('');
  const [isAddingChallenge, setIsAddingChallenge] = useState(false);
  const [isAddingIdea, setIsAddingIdea] = useState(false);

  const handleRemoveChallenge = (idx: number) => {
    setChallenges(challenges.filter((_, i) => i !== idx));
  };

  const handleRemoveIdea = (idx: number) => {
    setIdeas(ideas.filter((_, i) => i !== idx));
  };

  const handleAddChallenge = () => {
    if (newChallengeText.trim()) {
      setChallenges([...challenges, newChallengeText.trim()]);
      setNewChallengeText('');
      setIsAddingChallenge(false);
    }
  };

  const handleAddIdea = () => {
    if (newIdeaText.trim()) {
      setIdeas([...ideas, newIdeaText.trim()]);
      setNewIdeaText('');
      setIsAddingIdea(false);
    }
  };

  const handleSaveChallengeEdit = (idx: number, newText: string) => {
    const updated = [...challenges];
    updated[idx] = newText;
    setChallenges(updated);
    setEditingChallengeIndex(null);
  };

  const handleSaveIdeaEdit = (idx: number, newText: string) => {
    const updated = [...ideas];
    updated[idx] = newText;
    setIdeas(updated);
    setEditingIdeaIndex(null);
  };

  const handleConfirm = async () => {
    await onConfirm({
      challenges,
      initialAIIdeas: ideas,
      isConfirmed: true,
      uploadedImages: [],
      confirmedAt: Date.now(),
    });
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-6">
      {/* Header Task */}
      <div className="text-center mb-8">
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 font-mono block mb-2">
          Step 2 of 5 • Verify AI Understanding
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-serif-title mb-2">
          Here's what I understood
        </h1>
        <p className="text-sm text-slate-500">
          Review what was extracted. Edit any item or confirm to generate strategic opportunities.
        </p>
      </div>

      {/* Uncertainty Notice if any */}
      {uncertainties.length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Unclear handwritten items noted:</span>
            <p className="text-amber-800 mt-0.5">
              Some items had ambiguous handwriting or partial visibility. Please check the items marked with <span className="font-semibold text-amber-900 bg-amber-200/60 px-1 py-0.5 rounded">Needs confirmation</span>.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Section 1: Key Challenges */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Key challenges</h2>
              <span className="text-xs text-slate-400">Main problems identified by your team</span>
            </div>
            <button
              onClick={() => setIsAddingChallenge(true)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add challenge</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {challenges.map((item, idx) => {
              const isUncertain = idx === 3 && uncertainties.length > 0;
              const isEditing = editingChallengeIndex === idx;

              return (
                <div
                  key={idx}
                  className="group p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 flex items-start justify-between gap-3 transition-all"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>

                    {isEditing ? (
                      <input
                        type="text"
                        defaultValue={item}
                        autoFocus
                        onBlur={(e) => handleSaveChallengeEdit(idx, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveChallengeEdit(idx, e.currentTarget.value);
                          if (e.key === 'Escape') setEditingChallengeIndex(null);
                        }}
                        className="w-full text-sm text-slate-800 bg-white border border-indigo-500 rounded px-2 py-1 outline-none"
                      />
                    ) : (
                      <div className="flex-1">
                        <span className="text-sm font-medium text-slate-800 leading-snug">
                          {item}
                        </span>
                        {isUncertain && (
                          <span className="ml-2 inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                            Needs confirmation
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                    <button
                      onClick={() => setEditingChallengeIndex(isEditing ? null : idx)}
                      title="Edit this item"
                      className="p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRemoveChallenge(idx)}
                      title="Delete this item"
                      className="p-1 rounded text-slate-400 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {isAddingChallenge && (
              <div className="p-3 rounded-xl border border-indigo-300 bg-indigo-50/40 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type new challenge..."
                  value={newChallengeText}
                  autoFocus
                  onChange={(e) => setNewChallengeText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddChallenge()}
                  className="w-full text-sm text-slate-800 bg-white border border-slate-300 rounded-lg px-3 py-1.5 outline-none"
                />
                <button
                  onClick={handleAddChallenge}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold shrink-0 cursor-pointer"
                >
                  Add
                </button>
                <button
                  onClick={() => setIsAddingChallenge(false)}
                  className="text-xs text-slate-500 hover:text-slate-700 px-2 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Initial AI Ideas (Optional / Compact) */}
        {ideas.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Initial AI ideas</h2>
                <span className="text-xs text-slate-400">Concepts noted during discussion</span>
              </div>
              <button
                onClick={() => setIsAddingIdea(true)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add idea</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {ideas.map((item, idx) => {
                const isEditing = editingIdeaIndex === idx;

                return (
                  <div
                    key={idx}
                    className="group p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 flex items-start justify-between gap-3 transition-all"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>

                      {isEditing ? (
                        <input
                          type="text"
                          defaultValue={item}
                          autoFocus
                          onBlur={(e) => handleSaveIdeaEdit(idx, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveIdeaEdit(idx, e.currentTarget.value);
                            if (e.key === 'Escape') setEditingIdeaIndex(null);
                          }}
                          className="w-full text-sm text-slate-800 bg-white border border-indigo-500 rounded px-2 py-1 outline-none"
                        />
                      ) : (
                        <span className="text-sm font-medium text-slate-800 leading-snug">
                          {item}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      <button
                        onClick={() => setEditingIdeaIndex(isEditing ? null : idx)}
                        title="Edit this item"
                        className="p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleRemoveIdea(idx)}
                        title="Delete this item"
                        className="p-1 rounded text-slate-400 hover:text-red-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {isAddingIdea && (
                <div className="p-3 rounded-xl border border-indigo-300 bg-indigo-50/40 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Type new initial idea..."
                    value={newIdeaText}
                    autoFocus
                    onChange={(e) => setNewIdeaText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddIdea()}
                    className="w-full text-sm text-slate-800 bg-white border border-slate-300 rounded-lg px-3 py-1.5 outline-none"
                  />
                  <button
                    onClick={handleAddIdea}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold shrink-0 cursor-pointer"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setIsAddingIdea(false)}
                    className="text-xs text-slate-500 hover:text-slate-700 px-2 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3 Actions */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={onUploadAnother}
            type="button"
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
            <span>Upload another image</span>
          </button>

          <button
            onClick={handleConfirm}
            disabled={isProcessing || challenges.length === 0}
            id="confirm-continue-btn"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isProcessing ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin text-indigo-200" />
                <span>Generating strategic opportunities...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Confirm & Continue</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
