/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  Users,
  Upload,
  Camera,
  Check,
  Edit3,
  RefreshCw,
  AlertTriangle,
  Plus,
  Trash2,
  ArrowRight,
  Sparkles,
  HelpCircle,
  FileImage,
  CheckCircle2,
} from 'lucide-react';
import {
  HumanDiscussionData,
  ImageExtractionResult,
  UploadedWhiteboard,
} from '../types';
import { SAMPLE_WHITEBOARD_DATA } from '../data/defaultData';

interface Stage2DiscussProps {
  data: HumanDiscussionData;
  onUpdateData: (data: HumanDiscussionData) => void;
  onContinue: () => void;
  isLoading: boolean;
  onExtractImage: (imageDataUrl: string, userHint?: string) => Promise<ImageExtractionResult>;
}

export const Stage2Discuss: React.FC<Stage2DiscussProps> = ({
  data,
  onUpdateData,
  onContinue,
  isLoading,
  onExtractImage,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'text'>('upload');
  const [isEditingExtraction, setIsEditingExtraction] = useState(false);
  const [guardrailAlert, setGuardrailAlert] = useState<string | null>(null);

  // Local state for extracted items before confirmation
  const [stagedExtraction, setStagedExtraction] = useState<ImageExtractionResult | null>(
    data.uploadedImages.length > 0 && data.uploadedImages[0].extraction
      ? data.uploadedImages[0].extraction
      : null
  );

  // Local state for manually typed challenges & ideas
  const [challengesList, setChallengesList] = useState<string[]>(
    data.challenges.length > 0
      ? data.challenges
      : [
          'Single-source tier-2 chip and sensor suppliers in Southeast Asia vulnerable to regional shutdowns',
          'Cross-border customs bottlenecks causing 3-4 week untracked freight delays',
          'Lack of real-time inventory visibility across 3PL partner transit warehouses',
        ]
  );

  const [aiIdeasList, setAiIdeasList] = useState<string[]>(
    data.initialAIIdeas.length > 0
      ? data.initialAIIdeas
      : [
          'Real-time multi-tier supplier disruption radar using weak satellite/news signals',
          'Dynamic freight rerouting & autonomous container ETA prediction',
        ]
  );

  const [rawNotes, setRawNotes] = useState<string>(data.rawTextNotes || '');
  const [previewImage, setPreviewImage] = useState<string | null>(
    data.uploadedImages.length > 0 ? data.uploadedImages[0].dataUrl : null
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Trigger file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setPreviewImage(dataUrl);
      await processImage(dataUrl, file.name);
    };
    reader.readAsDataURL(file);
  };

  // Process image with Gemini Multimodal API
  const processImage = async (dataUrl: string, fileName: string) => {
    try {
      const extraction = await onExtractImage(dataUrl, rawNotes);
      setStagedExtraction(extraction);
      setIsEditingExtraction(false);

      const newUpload: UploadedWhiteboard = {
        id: `img-${Date.now()}`,
        dataUrl,
        name: fileName,
        timestamp: Date.now(),
        stage: 2,
        status: 'extracted',
        extraction,
      };

      onUpdateData({
        ...data,
        uploadedImages: [newUpload],
      });
    } catch (err) {
      console.error('Error processing whiteboard image:', err);
    }
  };

  // Load preset sample whiteboard for fast testing
  const handleLoadSampleWhiteboard = async () => {
    // Generate a high-contrast simulated whiteboard SVG representation
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Whiteboard background with subtle aluminum bezel
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, 900, 600);

      // Draw whiteboard header
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('EXECUTIVE WORKSHOP: SUPPLY CONTINUITY & AI IDEAS', 40, 50);

      // Draw Sticky Note 1 (Yellow - Challenges)
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(40, 80, 380, 230);
      ctx.fillStyle = '#854d0e';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('KEY VULNERABILITIES / CHALLENGES', 55, 110);
      ctx.fillStyle = '#1e293b';
      ctx.font = '13px sans-serif';
      ctx.fillText('1. Single-source Tier-2 chip suppliers in SE Asia', 55, 140);
      ctx.fillText('2. Customs & port congestion delays (3-4 wks)', 55, 170);
      ctx.fillText('3. Zero real-time 3PL inventory visibility', 55, 200);
      ctx.fillText('4. SCADA/OT legacy vulnerabilities in factories', 55, 230);
      ctx.fillText('5. Fragmented customer SLA alerts during outages', 55, 260);

      // Draw Sticky Note 2 (Blue - AI Ideas)
      ctx.fillStyle = '#bae6fd';
      ctx.fillRect(460, 80, 400, 230);
      ctx.fillStyle = '#0369a1';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('INITIAL AI OPPORTUNITIES', 475, 110);
      ctx.fillStyle = '#1e293b';
      ctx.font = '13px sans-serif';
      ctx.fillText('1. Weak-signal supplier monitoring radar', 475, 140);
      ctx.fillText('2. Autonomous freight rerouting & ETA engine', 475, 170);
      ctx.fillText('3. Dynamic crisis war-gaming playbooks', 475, 200);

      // Draw diagram box
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(40, 330, 820, 230);
      ctx.strokeStyle = '#94a3b8';
      ctx.strokeRect(40, 330, 820, 230);
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('CROSS-ECOSYSTEM DEPENDENCY FLOW [Tier 3 -> Tier 1 -> Assembly -> 3PL Transit -> Customer]', 60, 360);
      ctx.font = 'italic 12px sans-serif';
      ctx.fillText('*Note: ERP integration timeline requires validation with IT committee', 60, 400);
    }

    const dataUrl = canvas.toDataURL('image/png');
    setPreviewImage(dataUrl);
    await processImage(dataUrl, SAMPLE_WHITEBOARD_DATA.stage2.name);
  };

  // Confirm extracted information and save to workshop state
  const handleConfirmExtraction = () => {
    if (!stagedExtraction) return;

    onUpdateData({
      ...data,
      challenges: stagedExtraction.challenges,
      initialAIIdeas: stagedExtraction.initialAIIdeas,
      isConfirmed: true,
      confirmedAt: Date.now(),
      rawTextNotes: rawNotes,
    });
  };

  // Save manual typed conclusions to workshop state
  const handleSaveManualInputs = () => {
    const validChallenges = challengesList.filter(c => c.trim().length > 0);
    const validIdeas = aiIdeasList.filter(i => i.trim().length > 0);

    onUpdateData({
      ...data,
      challenges: validChallenges,
      initialAIIdeas: validIdeas,
      rawTextNotes: rawNotes,
      isConfirmed: true,
      confirmedAt: Date.now(),
    });
  };

  // Guardrail test simulation if someone prompts AI for solutions
  const handleTestGuardrail = () => {
    setGuardrailAlert(
      '“This stage is intended to capture your group’s own thinking before AI analysis. Please record your current view first.”'
    );
    setTimeout(() => setGuardrailAlert(null), 7000);
  };

  return (
    <div className="max-w-5xl mx-auto" id="stage-2-discuss">
      {/* Facilitator Prompt & Framing Questions */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 mb-8 shadow-xl">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Stage 2 of 6 — Human-Only Capture
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Discuss as a Team
              </h2>
            </div>
          </div>

          <button
            onClick={handleTestGuardrail}
            id="test-guardrail-btn"
            className="text-[11px] font-medium text-slate-400 hover:text-slate-200 px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 transition-colors flex items-center gap-1"
            title="Demonstrate anti-bias guardrail response"
          >
            <HelpCircle className="w-3 h-3 text-amber-400" />
            <span>Anti-Bias Rule</span>
          </button>
        </div>

        {/* Guardrail alert if triggered */}
        {guardrailAlert && (
          <div
            id="guardrail-alert-box"
            className="mb-6 p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs font-medium flex items-start gap-3 animate-fade-in"
          >
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block mb-0.5">Facilitator Protocol Enforcement:</span>
              <p>{guardrailAlert}</p>
            </div>
          </div>
        )}

        {/* The Two Convening Discussion Questions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
              Question 1 — Threats & Focus
            </span>
            <p className="text-sm font-semibold text-white leading-snug">
              What could threaten service continuity in an increasingly volatile environment, and where should management focus its attention?
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 block mb-1">
              Question 2 — Initial AI Hypotheses
            </span>
            <p className="text-sm font-semibold text-white leading-snug">
              Where do you currently see the greatest opportunities for AI to strengthen resilience?
            </p>
          </div>
        </div>

        {/* Input Method Tabs (Upload Whiteboard vs Type Text) */}
        <div className="flex items-center gap-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800 mb-6 max-w-md">
          <button
            id="tab-upload-whiteboard"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'upload'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Option B: Upload Whiteboard</span>
          </button>

          <button
            id="tab-type-text"
            onClick={() => setActiveTab('text')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'text'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Option A: Type Conclusions</span>
          </button>
        </div>

        {/* TAB 1: UPLOAD WHITEBOARD */}
        {activeTab === 'upload' && (
          <div className="space-y-6">
            {/* Upload Box / Dropzone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                  id="whiteboard-file-input"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-6 text-center cursor-pointer transition-all bg-slate-950/40 hover:bg-slate-950/60 flex flex-col items-center justify-center min-h-[220px]"
                >
                  <div className="w-12 h-12 rounded-full bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3">
                    <Camera className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-bold text-white mb-1">
                    Upload Whiteboard or Flipchart Photo
                  </span>
                  <p className="text-xs text-slate-400 max-w-xs mb-3">
                    Supports whiteboard photos, flipcharts, sticky-note walls, handwritten diagrams, or screenshots.
                  </p>
                  <span className="text-[11px] font-semibold text-indigo-400 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                    Click to browse or take photo
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-slate-400">No physical board handy?</span>
                  <button
                    onClick={handleLoadSampleWhiteboard}
                    id="stage2-load-sample-board-btn"
                    className="text-xs font-semibold text-amber-300 hover:text-amber-200 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Load Executive Whiteboard Sample</span>
                  </button>
                </div>
              </div>

              {/* Preview Thumbnail */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <FileImage className="w-3.5 h-3.5 text-indigo-400" />
                      Whiteboard Preview
                    </span>
                    {previewImage && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Image Loaded
                      </span>
                    )}
                  </div>

                  {previewImage ? (
                    <div className="relative rounded-xl overflow-hidden border border-slate-700/60 max-h-[160px] bg-slate-900">
                      <img
                        src={previewImage}
                        alt="Uploaded Whiteboard"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="h-[140px] rounded-xl border border-slate-800 bg-slate-900/40 flex items-center justify-center text-slate-500 text-xs italic">
                      No whiteboard photo uploaded yet
                    </div>
                  )}
                </div>

                {isLoading && (
                  <div className="mt-3 p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center gap-3 text-xs text-indigo-200">
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-400 shrink-0" />
                    <span>Multimodal AI is analyzing handwriting, sticky notes, and diagrams...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Structured Extraction Verification UI */}
            {stagedExtraction && (
              <div
                id="whiteboard-extraction-results"
                className="bg-slate-950 border border-indigo-500/40 rounded-2xl p-6 shadow-xl"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-5">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 block mb-0.5">
                      Multimodal Interpretation
                    </span>
                    <h3 className="text-base font-bold text-white">
                      I identified the following from your whiteboard:
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsEditingExtraction(!isEditingExtraction)}
                      id="extraction-edit-toggle-btn"
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{isEditingExtraction ? 'Finish Editing' : 'Edit Text'}</span>
                    </button>

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      id="extraction-reupload-btn"
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Re-upload</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Extracted Challenges */}
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400 block mb-2">
                      1. Identified Vulnerabilities / Challenges ({stagedExtraction.challenges.length})
                    </span>

                    {isEditingExtraction ? (
                      <div className="space-y-2">
                        {stagedExtraction.challenges.map((challenge, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={challenge}
                              onChange={(e) => {
                                const updated = [...stagedExtraction.challenges];
                                updated[idx] = e.target.value;
                                setStagedExtraction({ ...stagedExtraction, challenges: updated });
                              }}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                            />
                            <button
                              onClick={() => {
                                const updated = stagedExtraction.challenges.filter((_, i) => i !== idx);
                                setStagedExtraction({ ...stagedExtraction, challenges: updated });
                              }}
                              className="text-slate-500 hover:text-rose-400 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            setStagedExtraction({
                              ...stagedExtraction,
                              challenges: [...stagedExtraction.challenges, 'New challenge'],
                            });
                          }}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 mt-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Challenge
                        </button>
                      </div>
                    ) : (
                      <ol className="space-y-2 text-xs text-slate-200">
                        {stagedExtraction.challenges.map((challenge, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <span>{challenge}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>

                  {/* Extracted AI Opportunities */}
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 block mb-2">
                      2. Initial AI Ideas ({stagedExtraction.initialAIIdeas.length})
                    </span>

                    {isEditingExtraction ? (
                      <div className="space-y-2">
                        {stagedExtraction.initialAIIdeas.map((idea, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={idea}
                              onChange={(e) => {
                                const updated = [...stagedExtraction.initialAIIdeas];
                                updated[idx] = e.target.value;
                                setStagedExtraction({ ...stagedExtraction, initialAIIdeas: updated });
                              }}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                            />
                            <button
                              onClick={() => {
                                const updated = stagedExtraction.initialAIIdeas.filter((_, i) => i !== idx);
                                setStagedExtraction({ ...stagedExtraction, initialAIIdeas: updated });
                              }}
                              className="text-slate-500 hover:text-rose-400 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            setStagedExtraction({
                              ...stagedExtraction,
                              initialAIIdeas: [...stagedExtraction.initialAIIdeas, 'New AI opportunity'],
                            });
                          }}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 mt-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add AI Idea
                        </button>
                      </div>
                    ) : (
                      <ol className="space-y-2 text-xs text-slate-200">
                        {stagedExtraction.initialAIIdeas.map((idea, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <span>{idea}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                </div>

                {/* Uncertainties Callout if present */}
                {stagedExtraction.uncertainties && stagedExtraction.uncertainties.length > 0 && (
                  <div className="mb-6 p-3.5 rounded-xl bg-slate-900 border border-amber-500/30 text-xs">
                    <span className="font-bold text-amber-300 flex items-center gap-1.5 mb-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      Legibility & Uncertainty Notes:
                    </span>
                    <ul className="list-disc list-inside text-slate-300 space-y-1 pl-1">
                      {stagedExtraction.uncertainties.map((u, i) => (
                        <li key={i}>{u}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Confirmation Box (MANDATORY REQUIREMENT) */}
                <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-indigo-200">
                    <span className="font-bold text-white block mb-0.5">
                      “Is this an accurate interpretation of your group’s discussion?”
                    </span>
                    <p className="text-indigo-300/80">
                      Confirming will lock these challenges as the primary anchor for Stage 3 AI exploration.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={handleConfirmExtraction}
                      id="stage2-confirm-extraction-btn"
                      className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                        data.isConfirmed
                          ? 'bg-emerald-600 text-white'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{data.isConfirmed ? 'Confirmed & Saved' : 'Confirm Interpretation'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TYPE CONCLUSIONS */}
        {activeTab === 'text' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Question 1: Challenges List Builder */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 block mb-2">
                  1. Priority Vulnerabilities / Threats (3–5 items)
                </span>

                <div className="space-y-2.5">
                  {challengesList.map((ch, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-500">{idx + 1}.</span>
                      <input
                        type="text"
                        value={ch}
                        onChange={(e) => {
                          const updated = [...challengesList];
                          updated[idx] = e.target.value;
                          setChallengesList(updated);
                        }}
                        placeholder={`Challenge ${idx + 1}...`}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                      {challengesList.length > 2 && (
                        <button
                          onClick={() => setChallengesList(challengesList.filter((_, i) => i !== idx))}
                          className="text-slate-500 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}

                  {challengesList.length < 6 && (
                    <button
                      onClick={() => setChallengesList([...challengesList, ''])}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 pt-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add another challenge
                    </button>
                  )}
                </div>
              </div>

              {/* Question 2: Initial AI Hypotheses */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 block mb-2">
                  2. Initial AI Ideas from Team (2–4 items)
                </span>

                <div className="space-y-2.5">
                  {aiIdeasList.map((idea, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-500">{idx + 1}.</span>
                      <input
                        type="text"
                        value={idea}
                        onChange={(e) => {
                          const updated = [...aiIdeasList];
                          updated[idx] = e.target.value;
                          setAiIdeasList(updated);
                        }}
                        placeholder={`AI Idea ${idx + 1}...`}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                      {aiIdeasList.length > 1 && (
                        <button
                          onClick={() => setAiIdeasList(aiIdeasList.filter((_, i) => i !== idx))}
                          className="text-slate-500 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}

                  {aiIdeasList.length < 5 && (
                    <button
                      onClick={() => setAiIdeasList([...aiIdeasList, ''])}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 pt-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add another AI idea
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Team Notes Textarea */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Additional Workshop Discussion Context (Optional)
              </label>
              <textarea
                value={rawNotes}
                onChange={(e) => setRawNotes(e.target.value)}
                rows={3}
                placeholder="Record any nuance regarding regulatory mandates, budget limits, or specific partner constraints..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveManualInputs}
                id="stage2-save-manual-btn"
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Save Team Conclusions</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Continue Action Button */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-slate-400">
          {data.isConfirmed ? (
            <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Human challenges confirmed ({data.challenges.length} vulnerabilities recorded). Ready to explore with AI.
            </span>
          ) : (
            <span>Please confirm your group's interpretation or save conclusions before proceeding.</span>
          )}
        </div>

        <button
          onClick={onContinue}
          disabled={!data.isConfirmed && data.challenges.length === 0}
          id="stage2-proceed-btn"
          className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            data.isConfirmed || data.challenges.length > 0
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 cursor-pointer'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          <span>Continue to Stage 3 (Explore with AI)</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
