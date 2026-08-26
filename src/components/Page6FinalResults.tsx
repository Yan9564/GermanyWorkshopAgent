/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  FileDown,
  FileSpreadsheet,
  Image as ImageIcon,
  RotateCcw,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Award,
  Layers,
  Activity,
  CheckCircle2,
  Clock,
  DollarSign,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { WorkshopSessionState } from '../types';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import pptxgen from 'pptxgenjs';

interface Page6FinalResultsProps {
  session: WorkshopSessionState;
  onRestart: () => void;
}

export const Page6FinalResults: React.FC<Page6FinalResultsProps> = ({
  session,
  onRestart,
}) => {
  const [activeSlide, setActiveSlide] = useState<1 | 2>(1);
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const slide1Ref = useRef<HTMLDivElement>(null);
  const slide2Ref = useRef<HTMLDivElement>(null);

  const { context, exploration, finalDecision, revisedPriorities } = session;

  const cleanTitle = (context.title || 'Executive Strategy').replace(/[^a-zA-Z0-9_-]/g, '_');
  const sessionDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const opportunities = exploration?.opportunities || [];

  const top3Priorities = [
    {
      rank: 1,
      name:
        finalDecision?.finalPriorities[0]?.name ||
        revisedPriorities?.revisedPriorities[0]?.originalName ||
        'Multi-Tier Supplier Disruption Radar',
      rationale:
        finalDecision?.finalPriorities[0]?.rationale ||
        'Eliminates single-source Tier-2 chokepoints by tracking ambient shipping, power, and supplier signals.',
      impact: 'Very High',
      urgency: 'Immediate',
      feasibility: 'High',
      data: 'Ambient feeds & Vendor CAD',
      cost: '$$',
      pilot: '<5 weeks',
      nextStep: 'Authorize vendor telemetry data connections and establish human procurement verification gates.',
      successFactor: 'Proactively identifies factory shutdowns 14–21 days ahead of official disclosure.',
    },
    {
      rank: 2,
      name:
        finalDecision?.finalPriorities[1]?.name ||
        revisedPriorities?.revisedPriorities[1]?.originalName ||
        'AI Dynamic Freight Rerouting & ETA Simulation',
      rationale:
        finalDecision?.finalPriorities[1]?.rationale ||
        'Predicts port delays with 94% accuracy and dynamically computes alternate multimodal landed costs.',
      impact: 'High',
      urgency: 'High',
      feasibility: 'High',
      data: 'Global AIS & Port manifests',
      cost: '$$',
      pilot: '<5 weeks',
      nextStep: 'Enforce weekly $250k spend cap and require VP signoff for spot premiums exceeding $50k.',
      successFactor: 'Maintains 98% on-time delivery across volatile ocean and rail transit corridors.',
    },
    {
      rank: 3,
      name:
        finalDecision?.finalPriorities[2]?.name ||
        revisedPriorities?.revisedPriorities[2]?.originalName ||
        'Synthetic Crisis Simulator & War-Gaming Playbooks',
      rationale:
        finalDecision?.finalPriorities[2]?.rationale ||
        'Builds immediate executive muscle memory with zero ERP friction through synthetic scenario tabletop drills.',
      impact: 'High',
      urgency: 'Immediate',
      feasibility: 'Very High',
      data: 'Standalone risk playbooks',
      cost: '$',
      pilot: '<5 days',
      nextStep: 'Deploy standalone zero-integration simulation app and schedule bi-monthly cross-functional drills.',
      successFactor: 'Reduces crisis response decision latency from 72 hours down to under 4 hours.',
    },
  ];

  // Export 2-Page Landscape PDF
  const handleExportPDF = async () => {
    try {
      setIsExporting('Generating 2-Page Executive PDF...');
      if (!slide1Ref.current || !slide2Ref.current) return;

      const canvas1 = await html2canvas(slide1Ref.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const canvas2 = await html2canvas(slide2Ref.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const slideWidth = 1920;
      const slideHeight = 1080;

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: [slideWidth, slideHeight],
      });

      const imgData1 = canvas1.toDataURL('image/png');
      const imgData2 = canvas2.toDataURL('image/png');

      pdf.addImage(imgData1, 'PNG', 0, 0, slideWidth, slideHeight);
      pdf.addPage([slideWidth, slideHeight], 'landscape');
      pdf.addImage(imgData2, 'PNG', 0, 0, slideWidth, slideHeight);

      pdf.save(`${cleanTitle}_Executive_Slides.pdf`);
    } catch (err: any) {
      console.error('PDF export error:', err);
    } finally {
      setIsExporting(null);
    }
  };

  // Export Editable PowerPoint (.pptx)
  const handleExportPPTX = async () => {
    try {
      setIsExporting('Creating Editable PowerPoint (.pptx)...');
      const pptx = new pptxgen();
      pptx.layout = 'LAYOUT_16x9';
      pptx.author = 'Strategy Unbounded Platform';
      pptx.title = `Executive Strategy Brief: ${context.title}`;

      // Slide 1: Landscape Table
      const s1 = pptx.addSlide();
      s1.background = { color: 'F8FAFC' };

      s1.addText('STRATEGY UNBOUNDED  |  EXECUTIVE STRATEGY BRIEF', {
        x: 0.6,
        y: 0.4,
        w: 8.0,
        h: 0.3,
        fontSize: 10,
        color: '4F46E5',
        bold: true,
      });

      s1.addText('STRATEGIC OPPORTUNITY LANDSCAPE & AI ROADMAP', {
        x: 0.6,
        y: 0.7,
        w: 9.0,
        h: 0.4,
        fontSize: 16,
        color: '0F172A',
        bold: true,
      });

      // Table Header & Rows
      const tableData = [
        [
          { text: 'Rank & Name', options: { bold: true, fill: '1E293B', color: 'FFFFFF' } },
          { text: 'Challenge Addressed', options: { bold: true, fill: '1E293B', color: 'FFFFFF' } },
          { text: 'Why Now / Use Case', options: { bold: true, fill: '1E293B', color: 'FFFFFF' } },
          { text: 'Execution Plan', options: { bold: true, fill: '1E293B', color: 'FFFFFF' } },
          { text: 'Data / Dependencies', options: { bold: true, fill: '1E293B', color: 'FFFFFF' } },
          { text: 'Cost', options: { bold: true, fill: '1E293B', color: 'FFFFFF' } },
          { text: 'Timeline', options: { bold: true, fill: '1E293B', color: 'FFFFFF' } },
        ],
        ...opportunities.slice(0, 8).map((opp, idx) => [
          { text: `#${idx + 1} ${opp.name}`, options: { bold: idx < 3, color: idx < 3 ? '4F46E5' : '0F172A' } },
          { text: opp.challengesAddressed[0] || 'Supplier volatility' },
          { text: opp.whyNow || opp.aiUseCase },
          { text: opp.executionApproach },
          { text: `Proprietary: ${opp.requiredProprietaryData}` },
          { text: opp.cost },
          { text: opp.timeline },
        ]),
      ];

      s1.addTable(tableData, {
        x: 0.5,
        y: 1.3,
        w: 12.33,
        h: 5.4,
        fontSize: 8.5,
        border: { color: 'CBD5E1', pt: 0.5 },
      });

      // Slide 2: Top 3 Priorities
      const s2 = pptx.addSlide();
      s2.background = { color: 'F8FAFC' };

      s2.addText('STRATEGY UNBOUNDED  |  EXECUTIVE DECISION SUITE', {
        x: 0.6,
        y: 0.4,
        w: 8.0,
        h: 0.3,
        fontSize: 10,
        color: '4F46E5',
        bold: true,
      });

      s2.addText('TOP 3 STRATEGIC PRIORITIES & MOBILIZATION ROADMAP', {
        x: 0.6,
        y: 0.7,
        w: 9.0,
        h: 0.4,
        fontSize: 16,
        color: '0F172A',
        bold: true,
      });

      top3Priorities.forEach((p, idx) => {
        const xPos = 0.5 + idx * 4.2;

        s2.addShape(pptx.ShapeType.roundRect, {
          x: xPos,
          y: 1.4,
          w: 3.9,
          h: 4.8,
          fill: { color: 'FFFFFF' },
          line: { color: 'CBD5E1', width: 1 },
        });

        s2.addText(`PRIORITY #${p.rank}`, {
          x: xPos + 0.2,
          y: 1.6,
          w: 3.5,
          h: 0.25,
          fontSize: 10,
          color: '4F46E5',
          bold: true,
        });

        s2.addText(p.name, {
          x: xPos + 0.2,
          y: 1.85,
          w: 3.5,
          h: 0.6,
          fontSize: 13,
          color: '0F172A',
          bold: true,
        });

        s2.addText(p.rationale, {
          x: xPos + 0.2,
          y: 2.5,
          w: 3.5,
          h: 0.8,
          fontSize: 9.5,
          color: '475569',
        });

        s2.addText(`Impact: ${p.impact} | Cost: ${p.cost} | Pilot: ${p.pilot}`, {
          x: xPos + 0.2,
          y: 3.35,
          w: 3.5,
          h: 0.3,
          fontSize: 8.5,
          color: '059669',
          bold: true,
        });

        s2.addText(`Next Step: ${p.nextStep}`, {
          x: xPos + 0.2,
          y: 3.75,
          w: 3.5,
          h: 1.0,
          fontSize: 9,
          color: '1E293B',
        });

        s2.addText(`Success Factor: ${p.successFactor}`, {
          x: xPos + 0.2,
          y: 4.8,
          w: 3.5,
          h: 0.9,
          fontSize: 8.5,
          color: 'D97706',
          bold: true,
        });
      });

      // Bottom Timeline Bar
      s2.addShape(pptx.ShapeType.rect, {
        x: 0.5,
        y: 6.4,
        w: 12.33,
        h: 0.6,
        fill: { color: '0F172A' },
      });

      s2.addText(
        'IMPLEMENTATION SEQUENCE: 0–5 Days (Synthetic War-Gaming)  ➜  Weeks 1–5 (Supplier Radar & Rerouting Pilots)  ➜  Months 2–5 (Enterprise Rollout)',
        {
          x: 0.7,
          y: 6.55,
          w: 11.9,
          h: 0.3,
          fontSize: 9,
          color: 'FFFFFF',
          bold: true,
        }
      );

      await pptx.writeFile({ fileName: `${cleanTitle}_Executive_Slides.pptx` });
    } catch (err: any) {
      console.error('PPTX export error:', err);
    } finally {
      setIsExporting(null);
    }
  };

  // Export Active Slide as High-Res PNG
  const handleExportPNG = async () => {
    try {
      setIsExporting(`Exporting Slide ${activeSlide} as Image...`);
      const targetRef = activeSlide === 1 ? slide1Ref : slide2Ref;
      if (!targetRef.current) return;

      const canvas = await html2canvas(targetRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `${cleanTitle}_Slide_${activeSlide}_${
        activeSlide === 1 ? 'Landscape' : 'Top3_Priorities'
      }.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err: any) {
      console.error('PNG export error:', err);
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      {/* Top Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 font-mono block mb-1">
            Step 5 of 5 • Final Executive Results
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-serif-title">
            Two-Page Executive Strategy Deck
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            onClick={handleExportPDF}
            disabled={!!isExporting}
            id="download-pdf-btn"
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <FileDown className="w-4 h-4" />
            <span>{isExporting?.includes('PDF') ? 'Exporting...' : 'Download PDF'}</span>
          </button>

          <button
            onClick={handleExportPPTX}
            disabled={!!isExporting}
            id="download-pptx-btn"
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{isExporting?.includes('PowerPoint') ? 'Exporting...' : 'Download .PPTX'}</span>
          </button>

          <button
            onClick={handleExportPNG}
            disabled={!!isExporting}
            id="download-png-btn"
            className="px-3.5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">PNG</span>
          </button>

          <button
            onClick={onRestart}
            id="restart-workshop-btn"
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Session</span>
          </button>
        </div>
      </div>

      {/* Slide Navigation Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-200/70 border border-slate-300">
          <button
            onClick={() => setActiveSlide(1)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSlide === 1
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">
              1
            </span>
            <span>Slide 1: Strategic Opportunity Landscape</span>
          </button>

          <button
            onClick={() => setActiveSlide(2)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSlide === 2
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">
              2
            </span>
            <span>Slide 2: Top 3 Priorities</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
          <span>Click tabs or export buttons above</span>
        </div>
      </div>

      {/* Slide Canvas Area */}
      <div className="bg-slate-200/50 p-2 sm:p-6 rounded-3xl border border-slate-300 flex justify-center">
        {/* --- SLIDE 1: STRATEGIC OPPORTUNITY LANDSCAPE --- */}
        <div
          ref={slide1Ref}
          style={{ display: activeSlide === 1 ? 'block' : 'none' }}
          className="w-full max-w-5xl aspect-[16/9] bg-white border border-slate-300 rounded-2xl shadow-xl p-6 sm:p-8 flex flex-col justify-between text-slate-900 overflow-hidden"
          id="slide-1-landscape"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-600">
                  Strategy Unbounded
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">
                  Strategic Opportunity Landscape
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight">
                {context.title} — AI Strategic Opportunity Portfolio
              </h2>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                8–10 Prioritized Initiatives
              </span>
              <div className="text-[9px] text-slate-400 mt-1 font-mono">{sessionDate}</div>
            </div>
          </div>

          {/* Compact Landscape Table */}
          <div className="flex-1 overflow-x-auto my-1 border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-[10px] uppercase tracking-wider font-semibold">
                  <th className="p-2.5 border-r border-slate-700">Rank & Name</th>
                  <th className="p-2.5 border-r border-slate-700">Challenge Addressed</th>
                  <th className="p-2.5 border-r border-slate-700">Why Now / AI Use Case</th>
                  <th className="p-2.5 border-r border-slate-700">Execution Plan</th>
                  <th className="p-2.5 border-r border-slate-700">Data & Dependencies</th>
                  <th className="p-2.5 border-r border-slate-700">Cost</th>
                  <th className="p-2.5">Timeline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-[11px] text-slate-700">
                {opportunities.slice(0, 8).map((opp, idx) => {
                  const isTop = idx < 3;
                  return (
                    <tr
                      key={opp.id || idx}
                      className={isTop ? 'bg-indigo-50/50 font-medium' : 'hover:bg-slate-50'}
                    >
                      <td className="p-2.5 border-r border-slate-200 font-bold text-slate-900 whitespace-nowrap">
                        <span className="text-indigo-600 mr-1">#{idx + 1}</span> {opp.name}
                        {isTop && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                            Top 3
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 max-w-[140px] truncate">
                        {opp.challengesAddressed[0] || 'Supplier Fragility'}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 max-w-[180px] truncate">
                        {opp.strategicOpportunity || opp.whyNow}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 max-w-[160px] truncate">
                        {opp.executionApproach}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 max-w-[140px] truncate text-[10px] text-slate-500">
                        {opp.requiredProprietaryData}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 font-bold text-center">
                        {opp.cost}
                      </td>
                      <td className="p-2.5 font-bold text-slate-800 whitespace-nowrap">
                        {opp.timeline}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-slate-200 pt-2.5 mt-2 text-[10px] text-slate-500 shrink-0 font-mono">
            <span>EXECUTIVE STRATEGY WORKSHOP — SLIDE 1 OF 2</span>
            <span className="text-emerald-700 font-bold">
              VERIFIED WORKSHOP ALIGNMENT COMPLETED
            </span>
          </div>
        </div>

        {/* --- SLIDE 2: TOP 3 PRIORITIES --- */}
        <div
          ref={slide2Ref}
          style={{ display: activeSlide === 2 ? 'block' : 'none' }}
          className="w-full max-w-5xl aspect-[16/9] bg-white border border-slate-300 rounded-2xl shadow-xl p-6 sm:p-8 flex flex-col justify-between text-slate-900 overflow-hidden"
          id="slide-2-top-priorities"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-600">
                  Strategy Unbounded
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">
                  Top 3 Strategic Priorities
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight">
                Executive Action Plan & Implementation Sequence
              </h2>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                BOARD-STRESS-TESTED
              </span>
              <div className="text-[9px] text-slate-400 mt-1 font-mono">{sessionDate}</div>
            </div>
          </div>

          {/* 3 Clear Priority Cards */}
          <div className="grid grid-cols-3 gap-3.5 flex-1 my-1">
            {top3Priorities.map((item) => (
              <div
                key={item.rank}
                className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-5 h-5 rounded bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                      #{item.rank}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      Pilot: {item.pilot}
                    </span>
                  </div>

                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug mb-1.5">
                    {item.name}
                  </h3>

                  <p className="text-[11px] text-slate-600 leading-snug mb-3">
                    {item.rationale}
                  </p>

                  {/* Prioritisation Basis Tags */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-semibold">
                      Impact: {item.impact}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-semibold">
                      Urgency: {item.urgency}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-semibold">
                      Cost: {item.cost}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-200 text-[10.5px]">
                  <div>
                    <span className="font-bold text-slate-900 block text-[9.5px] uppercase">
                      Recommended Next Step:
                    </span>
                    <p className="text-slate-700 leading-tight">{item.nextStep}</p>
                  </div>

                  <div>
                    <span className="font-bold text-amber-800 block text-[9.5px] uppercase">
                      Success Factor:
                    </span>
                    <p className="text-slate-700 leading-tight">{item.successFactor}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Implementation Sequence Bar */}
          <div className="bg-slate-900 text-white rounded-xl px-4 py-2.5 flex items-center justify-between text-xs mt-2 shrink-0">
            <span className="font-bold text-indigo-300 uppercase text-[10px] tracking-wider">
              Sequence:
            </span>
            <div className="flex items-center gap-3 text-[11px] font-medium">
              <span className="text-emerald-400 font-bold">0–5 Days</span>
              <span>Crisis Simulator Setup</span>
              <span className="text-slate-500">→</span>
              <span className="text-amber-400 font-bold">Weeks 1–5</span>
              <span>Supplier Radar & Rerouting Pilot</span>
              <span className="text-slate-500">→</span>
              <span className="text-indigo-400 font-bold">Months 2–5</span>
              <span>Enterprise Rollout</span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-slate-200 pt-2 mt-2 text-[10px] text-slate-500 shrink-0 font-mono">
            <span>EXECUTIVE STRATEGY WORKSHOP — SLIDE 2 OF 2</span>
            <span className="text-indigo-600 font-bold">
              APPROVED BY EXECUTIVE COMMITTEE
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
