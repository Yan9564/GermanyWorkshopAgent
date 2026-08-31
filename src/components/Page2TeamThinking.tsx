/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  Image as ImageIcon,
  FileText,
  Sparkles,
  ArrowRight,
  X,
  CheckCircle2,
} from 'lucide-react';
import { SAMPLE_WHITEBOARD_IMAGES } from '../data/defaultData';

interface Page2TeamThinkingProps {
  initialText?: string;
  initialImage?: string;
  onAnalyse: (text: string, imageDataUrl?: string) => Promise<void>;
  isAnalysing: boolean;
}

export const Page2TeamThinking: React.FC<Page2TeamThinkingProps> = ({
  initialText = '',
  initialImage,
  onAnalyse,
  isAnalysing,
}) => {
  const [textNotes, setTextNotes] = useState(initialText);
  const [uploadedImage, setUploadedImage] = useState<string | undefined>(initialImage);
  const [imageName, setImageName] = useState<string>('Uploaded Board Photo');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPEG, WEBP).');
      return;
    }
    setImageName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSampleSelect = (sampleKey: keyof typeof SAMPLE_WHITEBOARD_IMAGES) => {
    const sample = SAMPLE_WHITEBOARD_IMAGES[sampleKey];
    if (sample) {
      setUploadedImage(sample.dataUrl);
      setImageName(sample.name);
      if (!textNotes.trim()) {
        setTextNotes(
          'Key points from team discussion:\n• Single-source Tier-2 suppliers in SE Asia vulnerable to shutdown\n• 3-4 week untracked delays at major container ports\n• Lack of real-time inventory visibility across 3PL partner warehouses\n• Cybersecurity threats against manufacturing systems'
        );
      }
    }
  };

  const handleSubmit = async () => {
    if (!textNotes.trim() && !uploadedImage) {
      alert('Please enter your notes or upload a photo of your board to continue.');
      return;
    }
    await onAnalyse(textNotes, uploadedImage);
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-6">
      {/* Header Task */}
      <div className="text-center mb-8">
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 font-mono block mb-2">
          Search • Sub-step 1B — Identify Challenges
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-serif-title mb-2">
          What are the most important challenges your organisation needs to address?
        </h1>
        <p className="text-sm text-slate-500">
          Add your team's discussion as text or upload a photo of your board.
        </p>
      </div>

      <div className="space-y-6">
        {/* Upload Whiteboard Area */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-indigo-600" />
              <span>Upload your whiteboard</span>
            </h2>
            <span className="text-xs text-slate-400">Whiteboard, flipchart, notes, sticky cards</span>
          </div>

          {!uploadedImage ? (
            <div>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                  isDragOver
                    ? 'border-indigo-500 bg-indigo-50/50'
                    : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50/50'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    Click to upload photo or drag & drop here
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Supports JPG, PNG, WEBP from your phone or camera
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
              </div>

              {/* Quick Sample Selector */}
              <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100">
                <span>Don't have a photo handy?</span>
                <button
                  type="button"
                  onClick={() => handleSampleSelect('supply_chain_whiteboard')}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                >
                  Load sample whiteboard photo
                </button>
              </div>
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 flex flex-col items-center">
              <img
                src={uploadedImage}
                alt="Uploaded Whiteboard"
                className="max-h-64 object-contain w-full"
              />
              <div className="w-full bg-slate-900/90 backdrop-blur px-4 py-2 flex items-center justify-between text-white text-xs">
                <span className="flex items-center gap-1.5 font-medium truncate max-w-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  {imageName}
                </span>
                <button
                  type="button"
                  onClick={() => setUploadedImage(undefined)}
                  className="text-slate-300 hover:text-white p-1 rounded hover:bg-slate-800 flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Type Notes Area */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Type your notes</span>
            </h2>
            <span className="text-xs text-slate-400">Bullet points or summary</span>
          </div>

          <textarea
            value={textNotes}
            onChange={(e) => setTextNotes(e.target.value)}
            placeholder="Type your team's main challenges and any initial ideas here... (e.g., Tier-2 supplier fragility, port transit delays, legacy cyber vulnerabilities)"
            rows={5}
            className="w-full p-4 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-slate-800 placeholder-slate-400 text-sm leading-relaxed transition-all resize-none"
          />
        </div>

        {/* Primary Action */}
        <div className="pt-4 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={isAnalysing || (!textNotes.trim() && !uploadedImage)}
            id="analyse-input-btn"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isAnalysing ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin text-indigo-200" />
                <span>Analysing your input...</span>
              </>
            ) : (
              <>
                <span>Analyse our input</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
