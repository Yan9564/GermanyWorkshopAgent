/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  Presentation,
  FileDown,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Award,
  Layers,
  Activity,
  CheckCircle2,
  Sliders,
  Sparkles,
  ArrowRight,
  Maximize2,
  Minimize2,
  FileSpreadsheet,
} from 'lucide-react';
import { WorkshopSessionState } from '../types';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import pptxgen from 'pptxgenjs';

interface ExecutiveSlideDeckModalProps {
  session: WorkshopSessionState;
  isOpen: boolean;
  onClose: () => void;
}

export const ExecutiveSlideDeckModal: React.FC<ExecutiveSlideDeckModalProps> = ({
  session,
  isOpen,
  onClose,
}) => {
  const [activeSlide, setActiveSlide] = useState<1 | 2>(1);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const slide1Ref = useRef<HTMLDivElement>(null);
  const slide2Ref = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const {
    context,
    humanDiscussion,
    finalDecision,
    boardChallenge,
    revisedPriorities,
    exploration,
  } = session;

  const cleanTitle = (context.title || 'Executive Strategy').replace(/[^a-zA-Z0-9_-]/g, '_');
  const sessionDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Export 2-Page Landscape PDF
  const handleExportPDF = async () => {
    try {
      setIsExporting('Generating 2-Page Executive PDF...');
      if (!slide1Ref.current || !slide2Ref.current) return;

      const canvas1 = await html2canvas(slide1Ref.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#090d16',
        logging: false,
      });

      const canvas2 = await html2canvas(slide2Ref.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#090d16',
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

  // Export Native PowerPoint (.pptx)
  const handleExportPPTX = async () => {
    try {
      setIsExporting('Creating Editable PowerPoint (.pptx)...');
      const pptx = new pptxgen();
      pptx.layout = 'LAYOUT_16x9';
      pptx.author = 'Strategy Unbounded Platform';
      pptx.company = 'Executive Strategy Workshop';
      pptx.title = `Executive Strategy Brief: ${context.title}`;

      // --- SLIDE 1: Executive Strategy Report ---
      const s1 = pptx.addSlide();
      s1.background = { color: '0A0F1D' };

      // Header Bar
      s1.addShape(pptx.ShapeType.rect, {
        x: 0.5,
        y: 0.4,
        w: 12.33,
        h: 0.8,
        fill: { color: '131C31' },
        line: { color: '2A3756', width: 1 },
      });

      s1.addText('STRATEGY UNBOUNDED  |  EXECUTIVE STRATEGY BRIEF', {
        x: 0.7,
        y: 0.5,
        w: 8.0,
        h: 0.25,
        fontSize: 10,
        color: '6366F1',
        bold: true,
      });

      s1.addText(context.title.toUpperCase(), {
        x: 0.7,
        y: 0.75,
        w: 8.5,
        h: 0.35,
        fontSize: 14,
        color: 'FFFFFF',
        bold: true,
      });

      s1.addText(`DATE: ${sessionDate}  |  STATUS: APPROVED BY EXECUTIVE COMMITTEE`, {
        x: 7.5,
        y: 0.65,
        w: 5.1,
        h: 0.3,
        fontSize: 9,
        color: '10B981',
        align: 'right',
        bold: true,
      });

      // Left Column: Strategic Framing & Rationale
      s1.addShape(pptx.ShapeType.roundRect, {
        x: 0.5,
        y: 1.4,
        w: 3.8,
        h: 5.4,
        fill: { color: '111827' },
        line: { color: '1F2937', width: 1 },
      });

      s1.addText('STRATEGIC CONTEXT & CORE QUESTION', {
        x: 0.7,
        y: 1.55,
        w: 3.4,
        h: 0.3,
        fontSize: 10,
        color: '94A3B8',
        bold: true,
      });

      s1.addText(context.coreQuestion, {
        x: 0.7,
        y: 1.85,
        w: 3.4,
        h: 0.9,
        fontSize: 11,
        color: 'E2E8F0',
        italic: true,
      });

      s1.addText('EXECUTIVE ALIGNMENT RATIONALE', {
        x: 0.7,
        y: 2.85,
        w: 3.4,
        h: 0.3,
        fontSize: 10,
        color: '818CF8',
        bold: true,
      });

      s1.addText(
        finalDecision?.finalExecutiveRationale ||
          revisedPriorities?.executiveAlignmentRationale ||
          context.background,
        {
          x: 0.7,
          y: 3.15,
          w: 3.4,
          h: 2.0,
          fontSize: 9.5,
          color: 'CBD5E1',
        }
      );

      s1.addText('KEY 5-DAY MOBILIZATION ACTIONS:', {
        x: 0.7,
        y: 5.25,
        w: 3.4,
        h: 0.25,
        fontSize: 9,
        color: 'F59E0B',
        bold: true,
      });

      const keyQuestionsText =
        finalDecision?.keyOpenQuestions?.slice(0, 2).map((q, i) => `${i + 1}. ${q}`).join('\n') ||
        '1. Designate cross-functional project sponsors.\n2. Finalize vendor data connection protocols.';
      s1.addText(keyQuestionsText, {
        x: 0.7,
        y: 5.5,
        w: 3.4,
        h: 1.1,
        fontSize: 8.5,
        color: '94A3B8',
      });

      // Right Side: 3 Strategic Priorities
      const priorities = finalDecision?.finalPriorities || [
        {
          rank: 1,
          name: 'Multi-Tier Supplier Disruption Radar',
          rationale: 'Addresses Tier-2 single-source chokepoints with automated early warning.',
          safeguardsAdopted: 'Human procurement dual-verification gate before reallocations.',
          timeframe: '<5 weeks',
        },
        {
          rank: 2,
          name: 'AI Dynamic Freight Rerouting & ETA Simulation',
          rationale: 'Mitigates port and transit delays with proactive multimodal routing.',
          safeguardsAdopted: 'Cumulative $250k weekly budget cap and $50k transaction signoff.',
          timeframe: '<5 weeks',
        },
        {
          rank: 3,
          name: 'Synthetic Crisis Simulator & War-Gaming Playbooks',
          rationale: 'Builds immediate executive muscle memory with zero ERP integration friction.',
          safeguardsAdopted: 'Mandatory quarterly tabletop drills and cross-functional sign-off.',
          timeframe: '<5 days',
        },
      ];

      priorities.forEach((p, index) => {
        const topY = 1.4 + index * 1.85;

        s1.addShape(pptx.ShapeType.roundRect, {
          x: 4.5,
          y: topY,
          w: 8.33,
          h: 1.7,
          fill: { color: '111827' },
          line: { color: '22304A', width: 1 },
        });

        // Priority Rank Badge
        s1.addShape(pptx.ShapeType.roundRect, {
          x: 4.7,
          y: topY + 0.15,
          w: 0.45,
          h: 0.45,
          fill: { color: '10B981' },
        });
        s1.addText(`#${p.rank}`, {
          x: 4.7,
          y: topY + 0.15,
          w: 0.45,
          h: 0.45,
          fontSize: 12,
          color: '0F172A',
          bold: true,
          align: 'center',
        });

        // Title & Horizon
        s1.addText(p.name, {
          x: 5.3,
          y: topY + 0.15,
          w: 5.8,
          h: 0.4,
          fontSize: 13,
          color: 'FFFFFF',
          bold: true,
        });

        s1.addText(`HORIZON: ${p.timeframe}`, {
          x: 10.8,
          y: topY + 0.15,
          w: 1.8,
          h: 0.35,
          fontSize: 9,
          color: '34D399',
          bold: true,
          align: 'right',
        });

        // Rationale Box
        s1.addText(`STRATEGIC RATIONALE: ${p.rationale}`, {
          x: 4.7,
          y: topY + 0.65,
          w: 7.9,
          h: 0.45,
          fontSize: 9.5,
          color: 'CBD5E1',
        });

        // Safeguard Box
        s1.addShape(pptx.ShapeType.rect, {
          x: 4.7,
          y: topY + 1.15,
          w: 7.9,
          h: 0.45,
          fill: { color: '1E1B4B' },
          line: { color: '3730A3', width: 0.5 },
        });
        s1.addText(`BOARD-APPROVED GOVERNANCE: ${p.safeguardsAdopted}`, {
          x: 4.8,
          y: topY + 1.2,
          w: 7.7,
          h: 0.35,
          fontSize: 8.5,
          color: 'A5B4FC',
          bold: true,
        });
      });

      // --- SLIDE 2: Strategic Resilience Framework ---
      const s2 = pptx.addSlide();
      s2.background = { color: '0A0F1D' };

      // Header Bar
      s2.addShape(pptx.ShapeType.rect, {
        x: 0.5,
        y: 0.4,
        w: 12.33,
        h: 0.8,
        fill: { color: '131C31' },
        line: { color: '2A3756', width: 1 },
      });

      s2.addText('STRATEGY UNBOUNDED  |  STRATEGIC RESILIENCE & AI GOVERNANCE FRAMEWORK', {
        x: 0.7,
        y: 0.5,
        w: 9.0,
        h: 0.25,
        fontSize: 10,
        color: '6366F1',
        bold: true,
      });

      s2.addText('4-PILLAR RESILIENCE ARCHITECTURE & DECISION MATRIX', {
        x: 0.7,
        y: 0.75,
        w: 8.5,
        h: 0.35,
        fontSize: 14,
        color: 'FFFFFF',
        bold: true,
      });

      s2.addText(`CROSS-FUNCTIONAL ALIGNMENT ARCHITECTURE`, {
        x: 8.0,
        y: 0.65,
        w: 4.6,
        h: 0.3,
        fontSize: 9,
        color: '818CF8',
        align: 'right',
        bold: true,
      });

      // 4 Framework Pillars in a 2x2 Bento Grid
      const pillars = [
        {
          num: 'PILLAR 01',
          title: 'Vulnerability Sensing & Tier-2 Telemetry Radar',
          subtitle: 'Continuous Ambient Early-Warning Layer',
          color: '38BDF8',
          items: [
            'Ambient NLP scanning of customs manifests, AIS shipping feeds, and power grid logs.',
            'Deep Bill-of-Materials (BOM) knowledge graph for rapid part substitution.',
            'Preserves 14–21 day lead-time advantage over reactive supplier notices.',
          ],
        },
        {
          num: 'PILLAR 02',
          title: 'Predictive Mitigation & Autonomous Rerouting Corridors',
          subtitle: 'Operational Flow Optimization Layer',
          color: '34D399',
          items: [
            'Dynamic multimodal transit simulation (Air vs Rail vs Ocean vs Inland).',
            'Predictive buffer stock optimization reducing capital lockup by 15–20%.',
            'Automated 3PL SLA compliance and freight drift detection.',
          ],
        },
        {
          num: 'PILLAR 03',
          title: 'Board-Level Risk Governance & Financial Guardrails',
          subtitle: 'Human-in-the-Loop Safeguard Architecture',
          color: 'F59E0B',
          items: [
            'Mandatory Human Thresholds: Dual-signoff for freight deviations >$50k.',
            'Cumulative 7-Day Spend Ceiling: $250k cap with CFO escalation protocols.',
            'Dual-Verification Gate: Human supplier audits before contractual reallocation.',
          ],
        },
        {
          num: 'PILLAR 04',
          title: 'Institutional Readiness & Tabletop War-Gaming',
          subtitle: 'Execution Muscle & Mobilization Layer',
          color: 'A855F7',
          items: [
            'Synthetic multi-scenario crisis simulations (<5 day deployment timeline).',
            'Bi-monthly executive stress drills with live compound shock injections.',
            'Integrated post-mortem feedback loops updating procurement master policies.',
          ],
        },
      ];

      pillars.forEach((pil, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const x = 0.5 + col * 6.3;
        const y = 1.4 + row * 2.55;

        s2.addShape(pptx.ShapeType.roundRect, {
          x: x,
          y: y,
          w: 6.03,
          h: 2.4,
          fill: { color: '111827' },
          line: { color: '1F2937', width: 1 },
        });

        s2.addText(pil.num, {
          x: x + 0.25,
          y: y + 0.18,
          w: 2.5,
          h: 0.2,
          fontSize: 8.5,
          color: pil.color,
          bold: true,
        });

        s2.addText(pil.title, {
          x: x + 0.25,
          y: y + 0.4,
          w: 5.5,
          h: 0.35,
          fontSize: 12,
          color: 'FFFFFF',
          bold: true,
        });

        s2.addText(pil.subtitle, {
          x: x + 0.25,
          y: y + 0.75,
          w: 5.5,
          h: 0.25,
          fontSize: 9,
          color: '94A3B8',
          italic: true,
        });

        const itemsList = pil.items.map((it) => `• ${it}`).join('\n');
        s2.addText(itemsList, {
          x: x + 0.25,
          y: y + 1.05,
          w: 5.5,
          h: 1.2,
          fontSize: 9.5,
          color: 'CBD5E1',
        });
      });

      // Bottom Decision Trail Bar
      s2.addShape(pptx.ShapeType.rect, {
        x: 0.5,
        y: 6.6,
        w: 12.33,
        h: 0.45,
        fill: { color: '0F172A' },
        line: { color: '334155', width: 0.5 },
      });

      s2.addText(
        'DECISION TRAIL: 1. Human Vulnerability Framing  ➜  2. AI Opportunity Exploration  ➜  3. Executive Review  ➜  4. Board Stress-Test  ➜  5. Final Capital Decisions',
        {
          x: 0.7,
          y: 6.68,
          w: 11.9,
          h: 0.3,
          fontSize: 8.5,
          color: '94A3B8',
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

  // Export High-Res PNG Image of Active Slide
  const handleExportPNG = async (slideNumber: 1 | 2) => {
    try {
      setIsExporting(`Exporting Slide ${slideNumber} as Image...`);
      const targetRef = slideNumber === 1 ? slide1Ref : slide2Ref;
      if (!targetRef.current) return;

      const canvas = await html2canvas(targetRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#090d16',
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `${cleanTitle}_Slide_${slideNumber}_${
        slideNumber === 1 ? 'Report' : 'Framework'
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
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto ${
        isFullscreen ? 'p-0' : ''
      }`}
      id="executive-slide-deck-modal"
    >
      <div
        className={`bg-slate-900 border border-slate-800 shadow-2xl flex flex-col transition-all duration-300 ${
          isFullscreen
            ? 'w-screen h-screen rounded-none'
            : 'w-full max-w-6xl max-h-[96vh] rounded-3xl overflow-hidden'
        }`}
      >
        {/* Top Control Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">
              <Presentation className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase font-bold tracking-widest text-indigo-400">
                  2-Page Presentation Suite
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/80 font-bold">
                  16:9 HD Ready
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Executive Strategy Deck: Report & Resilience Framework
              </h2>
            </div>
          </div>

          {/* Slide Navigation Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
            <button
              onClick={() => setActiveSlide(1)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeSlide === 1
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-indigo-950 text-white text-[10px] flex items-center justify-center font-bold">
                1
              </span>
              <span>Slide 1: Executive Report</span>
            </button>

            <button
              onClick={() => setActiveSlide(2)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeSlide === 2
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-indigo-950 text-white text-[10px] flex items-center justify-center font-bold">
                2
              </span>
              <span>Slide 2: Strategic Framework</span>
            </button>
          </div>

          {/* Export Actions & Close */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPDF}
              disabled={!!isExporting}
              id="export-pdf-slides-btn"
              className="px-3 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-sm"
              title="Download 2-page landscape PDF presentation"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>{isExporting?.includes('PDF') ? 'Exporting...' : 'Download PDF'}</span>
            </button>

            <button
              onClick={handleExportPPTX}
              disabled={!!isExporting}
              id="export-pptx-slides-btn"
              className="px-3 py-2 rounded-xl text-xs font-bold text-amber-300 bg-amber-950/50 hover:bg-amber-900/60 border border-amber-500/40 disabled:opacity-50 transition-colors flex items-center gap-1.5"
              title="Download editable Microsoft PowerPoint (.pptx) deck"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{isExporting?.includes('PowerPoint') ? 'Creating...' : 'Download .PPTX'}</span>
            </button>

            <button
              onClick={() => handleExportPNG(activeSlide)}
              disabled={!!isExporting}
              id="export-png-slide-btn"
              className="px-3 py-2 rounded-xl text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
              title="Download active slide as high-resolution PNG image"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PNG</span>
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Presentation'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
              title="Close Slides"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Loading Indicator */}
        {isExporting && (
          <div className="bg-indigo-950/80 border-b border-indigo-500/30 px-4 py-2 text-xs text-indigo-200 flex items-center justify-center gap-2 animate-pulse">
            <Sparkles className="w-4 h-4 text-indigo-400 animate-spin" />
            <span>{isExporting}</span>
          </div>
        )}

        {/* Slide Display Area (16:9 Canvas) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-center bg-slate-950/50">
          <div className="w-full max-w-5xl flex flex-col items-center">
            {/* --- SLIDE 1 CONTAINER --- */}
            <div
              ref={slide1Ref}
              style={{ display: activeSlide === 1 ? 'block' : 'none' }}
              className="w-full aspect-[16/9] bg-[#0A0F1D] border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 flex flex-col justify-between text-slate-100 relative overflow-hidden"
              id="slide-1-executive-report"
            >
              {/* Subtle background ambient glow */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-600/5 rounded-full blur-3xl pointer-events-none" />

              {/* Slide Header */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-xs">
                    SU
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono uppercase tracking-widest text-indigo-400 font-bold">
                        Strategy Unbounded
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400">
                        Executive Strategy Brief
                      </span>
                    </div>
                    <h1 className="text-base sm:text-lg font-black text-white tracking-tight leading-tight">
                      {context.title}
                    </h1>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                    APPROVED BY EXECUTIVE COMMITTEE
                  </span>
                  <div className="text-[9px] text-slate-400 mt-1 font-mono">{sessionDate}</div>
                </div>
              </div>

              {/* Slide Content Grid: 2 Columns */}
              <div className="grid grid-cols-12 gap-4 flex-1 items-stretch overflow-hidden">
                {/* Left Column: Context, Alignment & Next Steps */}
                <div className="col-span-4 bg-slate-900/80 border border-slate-800/90 rounded-xl p-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Core Problem Framing
                      </span>
                      <p className="text-xs text-slate-200 font-medium italic leading-snug">
                        "{context.coreQuestion}"
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-400 block mb-1">
                        Strategic Alignment Rationale
                      </span>
                      <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-6">
                        {finalDecision?.finalExecutiveRationale ||
                          revisedPriorities?.executiveAlignmentRationale ||
                          context.background}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 mt-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
                      Immediate 5-Day Mobilization:
                    </span>
                    <ul className="text-[10px] text-slate-400 space-y-1">
                      {(finalDecision?.keyOpenQuestions?.slice(0, 2) || [
                        'Designate initiative executive sponsors across Supply Chain & IT.',
                        'Formalize dual-verification procurement review gates.',
                      ]).map((q, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-amber-400 font-bold">•</span>
                          <span className="line-clamp-2">{q}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Right Column: 3 Strategic Priorities */}
                <div className="col-span-8 flex flex-col justify-between gap-2.5">
                  {(
                    finalDecision?.finalPriorities || [
                      {
                        rank: 1,
                        name: 'Multi-Tier Supplier Disruption Radar & Deep BOM Graph',
                        rationale:
                          'Connects Tier-2 weak signals with component substitute engineering CAD data.',
                        safeguardsAdopted:
                          'Human procurement dual-verification gate before contractual reallocations.',
                        timeframe: '<5 weeks',
                      },
                      {
                        rank: 2,
                        name: 'AI Dynamic Freight Rerouting with Financial Controls',
                        rationale:
                          'Predicts port delays with 94% accuracy and computes alternate corridor landed costs.',
                        safeguardsAdopted:
                          'Human approval on transactions >$50k and rolling weekly $250k spend cap.',
                        timeframe: '<5 weeks',
                      },
                      {
                        rank: 3,
                        name: 'Synthetic Crisis Simulator & War-Gaming Playbooks',
                        rationale:
                          'Delivers instant executive rehearsal for compound geopolitical shocks in <5 days.',
                        safeguardsAdopted:
                          'Bi-monthly tabletop exercises with live scenario injections.',
                        timeframe: '<5 days',
                      },
                    ]
                  ).map((p) => (
                    <div
                      key={p.rank}
                      className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between flex-1"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center">
                            #{p.rank}
                          </span>
                          <h3 className="text-xs sm:text-sm font-bold text-white leading-tight">
                            {p.name}
                          </h3>
                        </div>
                        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-slate-950 text-emerald-300 border border-slate-700">
                          {p.timeframe}
                        </span>
                      </div>

                      <div className="grid grid-cols-12 gap-3 text-[11px]">
                        <div className="col-span-7">
                          <span className="text-[8.5px] font-bold uppercase text-slate-400 block mb-0.5">
                            Strategic Rationale:
                          </span>
                          <p className="text-slate-200 line-clamp-2 leading-tight font-medium">
                            {p.rationale}
                          </p>
                        </div>
                        <div className="col-span-5 bg-indigo-950/40 border border-indigo-500/20 rounded-lg p-2">
                          <span className="text-[8.5px] font-bold uppercase text-indigo-300 block mb-0.5 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-indigo-400" />
                            Board Governance Safeguard:
                          </span>
                          <p className="text-indigo-100 text-[10px] line-clamp-2 leading-tight">
                            {p.safeguardsAdopted}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Slide Footer */}
              <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5 mt-3 text-[9px] text-slate-400 shrink-0 font-mono">
                <span>STRATEGY UNBOUNDED EXECUTIVE SUITE — REPORT SLIDE 1 OF 2</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  VERIFIED AUDIT TRAIL PRESERVED
                </span>
              </div>
            </div>

            {/* --- SLIDE 2 CONTAINER --- */}
            <div
              ref={slide2Ref}
              style={{ display: activeSlide === 2 ? 'block' : 'none' }}
              className="w-full aspect-[16/9] bg-[#0A0F1D] border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 flex flex-col justify-between text-slate-100 relative overflow-hidden"
              id="slide-2-strategic-framework"
            >
              {/* Subtle background ambient glow */}
              <div className="absolute top-0 left-0 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

              {/* Slide Header */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-xs">
                    SU
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono uppercase tracking-widest text-indigo-400 font-bold">
                        Strategy Unbounded
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400">
                        Strategic Resilience Architecture
                      </span>
                    </div>
                    <h1 className="text-base sm:text-lg font-black text-white tracking-tight leading-tight">
                      Strategic Resilience & AI Governance Framework
                    </h1>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-500/30">
                    4-PILLAR DECISION MODEL
                  </span>
                  <div className="text-[9px] text-slate-400 mt-1 font-mono">{sessionDate}</div>
                </div>
              </div>

              {/* 4-Pillar Quad Matrix */}
              <div className="grid grid-cols-2 gap-3.5 flex-1 items-stretch overflow-hidden">
                {/* Pillar 1 */}
                <div className="bg-slate-900/90 border border-sky-500/30 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[9px] font-mono font-black uppercase text-sky-400">
                        PILLAR 01
                      </span>
                      <span className="text-[9px] px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800/60 font-semibold">
                        Sensing Layer
                      </span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-white mb-0.5">
                      Vulnerability Sensing & Tier-2 Telemetry Radar
                    </h3>
                    <p className="text-[10px] text-slate-400 mb-2 italic">
                      Continuous Ambient Early-Warning Data Integration
                    </p>

                    <ul className="text-[10.5px] text-slate-300 space-y-1.5">
                      <li className="flex items-start gap-1.5">
                        <span className="text-sky-400 font-bold">▪</span>
                        <span>
                          <strong>Ambient NLP Ingestion:</strong> Customs manifests, AIS marine
                          telemetry, power grid logs.
                        </span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-sky-400 font-bold">▪</span>
                        <span>
                          <strong>BOM Knowledge Graph:</strong> Automated component cross-referencing
                          and alternate vendor matching.
                        </span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-sky-400 font-bold">▪</span>
                        <span>
                          <strong>Preemptive Advantage:</strong> Flags Tier-2 distress 14–21 days
                          ahead of official disclosure.
                        </span>
                      </li>
                    </ul>
                  </div>
                  <div className="text-[9px] text-sky-400/80 font-mono mt-2 pt-2 border-t border-slate-800">
                    Primary Data Assets: Vendor Master, Engineering CAD Specs, Global AIS Logs
                  </div>
                </div>

                {/* Pillar 2 */}
                <div className="bg-slate-900/90 border border-emerald-500/30 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[9px] font-mono font-black uppercase text-emerald-400">
                        PILLAR 02
                      </span>
                      <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-semibold">
                        Optimization Layer
                      </span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-white mb-0.5">
                      Predictive Mitigation & Autonomous Rerouting Corridors
                    </h3>
                    <p className="text-[10px] text-slate-400 mb-2 italic">
                      Dynamic Logistics Flow & Working Capital Balancer
                    </p>

                    <ul className="text-[10.5px] text-slate-300 space-y-1.5">
                      <li className="flex items-start gap-1.5">
                        <span className="text-emerald-400 font-bold">▪</span>
                        <span>
                          <strong>Dynamic Rerouting:</strong> Multimodal corridor evaluation (Air vs
                          Rail vs Ocean vs Inland).
                        </span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-emerald-400 font-bold">▪</span>
                        <span>
                          <strong>Buffer Stock Optimization:</strong> Balances stockout penalties
                          against inventory holding costs.
                        </span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-emerald-400 font-bold">▪</span>
                        <span>
                          <strong>3PL SLA Enforcement:</strong> Real-time compliance tracking and
                          demurrage fee reconciliation.
                        </span>
                      </li>
                    </ul>
                  </div>
                  <div className="text-[9px] text-emerald-400/80 font-mono mt-2 pt-2 border-t border-slate-800">
                    Target Impact: 94% ETA Precision, 18% Working Capital Optimization
                  </div>
                </div>

                {/* Pillar 3 */}
                <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[9px] font-mono font-black uppercase text-amber-400">
                        PILLAR 03
                      </span>
                      <span className="text-[9px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/60 font-semibold">
                        Governance Layer
                      </span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-white mb-0.5">
                      Board Risk Governance & Human Financial Controls
                    </h3>
                    <p className="text-[10px] text-slate-400 mb-2 italic">
                      Preventing Automation Complacency & Cascade Failures
                    </p>

                    <ul className="text-[10.5px] text-slate-300 space-y-1.5">
                      <li className="flex items-start gap-1.5">
                        <span className="text-amber-400 font-bold">▪</span>
                        <span>
                          <strong>Spend Authorization Gates:</strong> Mandatory human sign-off on
                          spot freight commits &gt;$50k.
                        </span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-amber-400 font-bold">▪</span>
                        <span>
                          <strong>Aggregate 7-Day Spend Ceiling:</strong> $250k rolling cap with
                          automatic CFO committee escalation.
                        </span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-amber-400 font-bold">▪</span>
                        <span>
                          <strong>Dual-Verification Gate:</strong> Human procurement audit required
                          prior to vendor reallocation.
                        </span>
                      </li>
                    </ul>
                  </div>
                  <div className="text-[9px] text-amber-400/80 font-mono mt-2 pt-2 border-t border-slate-800">
                    Lead Director Finding: Safeguards Sufficient with Cumulative Budget Controls
                  </div>
                </div>

                {/* Pillar 4 */}
                <div className="bg-slate-900/90 border border-purple-500/30 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[9px] font-mono font-black uppercase text-purple-400">
                        PILLAR 04
                      </span>
                      <span className="text-[9px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/60 font-semibold">
                        Mobilization Layer
                      </span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-white mb-0.5">
                      Executive Muscle & Synthetic War-Gaming
                    </h3>
                    <p className="text-[10px] text-slate-400 mb-2 italic">
                      Institutional Memory & Rapid Crisis Rehearsal
                    </p>

                    <ul className="text-[10.5px] text-slate-300 space-y-1.5">
                      <li className="flex items-start gap-1.5">
                        <span className="text-purple-400 font-bold">▪</span>
                        <span>
                          <strong>Fast-Track Simulation (&lt;5 Days):</strong> Standalone tabletop
                          crisis simulator requiring zero ERP code.
                        </span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-purple-400 font-bold">▪</span>
                        <span>
                          <strong>Bi-Monthly Tabletop Drills:</strong> Rehearsals with unannounced
                          compound shock injections.
                        </span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-purple-400 font-bold">▪</span>
                        <span>
                          <strong>Dynamic Playbooks:</strong> Continuously calibrated against newly
                          contracted vendor master records.
                        </span>
                      </li>
                    </ul>
                  </div>
                  <div className="text-[9px] text-purple-400/80 font-mono mt-2 pt-2 border-t border-slate-800">
                    Mobilization Target: Standalone deployment in 5 days; executive drill in week 2
                  </div>
                </div>
              </div>

              {/* Slide 2 Decision Trail Footer */}
              <div className="flex items-center justify-between border-t border-slate-800/80 pt-2 mt-2 text-[9px] text-slate-400 shrink-0 font-mono">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="text-indigo-400 font-bold">DECISION TRAIL:</span>
                  <span>1. Team Framing</span>
                  <span>→</span>
                  <span>2. AI Exploration</span>
                  <span>→</span>
                  <span>3. Executive Review</span>
                  <span>→</span>
                  <span>4. Board Stress-Test</span>
                  <span>→</span>
                  <span className="text-emerald-400 font-bold">5. Capital Deployment</span>
                </span>
                <span>STRATEGY UNBOUNDED — FRAMEWORK SLIDE 2 OF 2</span>
              </div>
            </div>

            {/* Slide Indicator Dots and Arrows */}
            <div className="flex items-center justify-between w-full mt-4 px-2">
              <button
                onClick={() => setActiveSlide(1)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1 ${
                  activeSlide === 1
                    ? 'opacity-40 cursor-not-allowed text-slate-500 border-slate-800'
                    : 'text-slate-300 border-slate-700 bg-slate-900 hover:bg-slate-800'
                }`}
                disabled={activeSlide === 1}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous: Slide 1</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveSlide(1)}
                  className={`h-2 rounded-full transition-all ${
                    activeSlide === 1 ? 'w-8 bg-indigo-500' : 'w-2 bg-slate-700'
                  }`}
                  aria-label="Slide 1"
                />
                <button
                  onClick={() => setActiveSlide(2)}
                  className={`h-2 rounded-full transition-all ${
                    activeSlide === 2 ? 'w-8 bg-indigo-500' : 'w-2 bg-slate-700'
                  }`}
                  aria-label="Slide 2"
                />
              </div>

              <button
                onClick={() => setActiveSlide(2)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1 ${
                  activeSlide === 2
                    ? 'opacity-40 cursor-not-allowed text-slate-500 border-slate-800'
                    : 'text-slate-300 border-slate-700 bg-slate-900 hover:bg-slate-800'
                }`}
                disabled={activeSlide === 2}
              >
                <span>Next: Slide 2</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
