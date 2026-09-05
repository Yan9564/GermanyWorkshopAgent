/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Page1Welcome } from './components/Page1Welcome';
import { Page2TeamThinking } from './components/Page2TeamThinking';
import { Page3ConfirmUnderstanding } from './components/Page3ConfirmUnderstanding';
import { Page4ExploreOpportunities } from './components/Page4ExploreOpportunities';
import { Page5ChallengePriorities } from './components/Page5ChallengePriorities';
import { Page6FinalResults } from './components/Page6FinalResults';
import { WorkshopContextForm } from './components/WorkshopContextForm';
import { WorkshopContextSummary } from './components/WorkshopContextSummary';

import {
  WorkshopSessionState,
  HumanDiscussionData,
  ImageExtractionResult,
  AIExplorationOutput,
  BoardChallengeOutput,
  RevisedPrioritiesOutput,
  ReviewDecision,
  WorkshopContext,
  WorkshopChallenge,
  WorkshopInteractionInput,
  AIOpportunity,
} from './types';

import {
  DEFAULT_WORKSHOP_CONTEXT,
  SAMPLE_EXPLORATION_OUTPUT,
  SAMPLE_REVISED_PRIORITIES,
  SAMPLE_BOARD_CHALLENGE,
  SAMPLE_WHITEBOARD_DATA,
} from './data/defaultData';
import { getMainStageForStep } from './workshopStages';
import { createInteractionEvent, createResearchId } from './researchLog';
import { buildLongList } from './longList';

const isSubstantiveChallenge = (value: string) => {
  const text = value.trim();
  return text.length > 3 && !/^(we (noted|identified|discussed)|let['’]?s move on|this is challenge (number|#)|challenge (number|#)\s*\d+)/i.test(text);
};

const INITIAL_SESSION: WorkshopSessionState = {
  id: `session-${Date.now()}`,
  currentStage: 1, // 1 to 6
  mainStage: 'search',
  context: DEFAULT_WORKSHOP_CONTEXT,
  challengeEntities: [],
  humanDiscussion: {
    challenges: [],
    initialAIIdeas: [],
    uploadedImages: [],
    isConfirmed: false,
  },
  exploration: null,
  humanReview: {
    reviews: {},
    whiteboardFeedback: null,
  },
  revisedPriorities: null,
  boardChallenge: null,
  finalDecision: null,
  chatHistory: [],
  interactions: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

export default function App() {
  const [session, setSession] = useState<WorkshopSessionState>(() => {
    const saved = localStorage.getItem('strategy_unbounded_simple_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Normalize stage to 1..6
        if (parsed.currentStage === 0 || !parsed.currentStage) parsed.currentStage = 1;
        parsed.mainStage = getMainStageForStep(parsed.currentStage);
        parsed.context = {
          ...DEFAULT_WORKSHOP_CONTEXT,
          ...(parsed.context || {}),
          objective: parsed.context?.objective || parsed.context?.workshopObjective || '',
          additionalContext: parsed.context?.additionalContext || parsed.context?.background || '',
        };
        parsed.interactions = Array.isArray(parsed.interactions) ? parsed.interactions : [];
        parsed.challengeEntities = Array.isArray(parsed.challengeEntities)
          ? parsed.challengeEntities
          : (parsed.humanDiscussion?.challenges || []).map((text: string) => ({
              id: createResearchId('challenge'),
              text,
              source: 'ai',
              originalAIText: text,
            }));
        return parsed;
      } catch (e) {
        console.error('Failed to parse saved session:', e);
      }
    }
    return INITIAL_SESSION;
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [uncertainties, setUncertainties] = useState<string[]>([]);
  const [isEditingContext, setIsEditingContext] = useState(false);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('strategy_unbounded_simple_session', JSON.stringify(session));
  }, [session]);

  const setStage = (stage: number) => {
    setSession((prev) => ({
      ...prev,
      currentStage: stage as any,
      mainStage: getMainStageForStep(stage),
      updatedAt: Date.now(),
    }));
  };

  const logInteraction = (input: WorkshopInteractionInput) => {
    setSession((prev) => ({
      ...prev,
      interactions: [...(prev.interactions || []), createInteractionEvent(prev.id, input)],
      updatedAt: Date.now(),
    }));
  };

  const updateChallenges = (challenges: WorkshopChallenge[]) => {
    setSession((prev) => ({
      ...prev,
      challengeEntities: challenges,
      humanDiscussion: {
        ...prev.humanDiscussion,
        challenges: challenges.map((challenge) => challenge.text),
      },
      updatedAt: Date.now(),
    }));
  };

  const updateOpportunities = (opportunities: AIOpportunity[]) => {
    setSession((prev) => ({
      ...prev,
      exploration: prev.exploration
        ? { ...prev.exploration, opportunities }
        : { ...SAMPLE_EXPLORATION_OUTPUT, opportunities },
      updatedAt: Date.now(),
    }));
  };

  // 1. Reset workshop
  const handleResetWorkshop = () => {
    const fresh: WorkshopSessionState = {
      ...INITIAL_SESSION,
      id: `session-${Date.now()}`,
      currentStage: 1,
      mainStage: 'search',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setSession(fresh);
    setIsEditingContext(false);
    localStorage.removeItem('strategy_unbounded_simple_session');
  };

  const handleSaveContext = (context: WorkshopContext) => {
    setSession((prev) => ({
      ...prev,
      context,
      currentStage: prev.currentStage === 1 ? 2 : prev.currentStage,
      mainStage: prev.currentStage === 1 ? 'search' : prev.mainStage,
      updatedAt: Date.now(),
    }));
    setIsEditingContext(false);
  };

  // 2. Load demo sample
  const handleLoadDemoSession = () => {
    const demoSession: WorkshopSessionState = {
      id: `demo-session-${Date.now()}`,
      currentStage: 4,
      mainStage: 'representation',
      context: DEFAULT_WORKSHOP_CONTEXT,
      challengeEntities: SAMPLE_WHITEBOARD_DATA.stage2.challenges.map((text) => ({
        id: createResearchId('challenge'),
        text,
        source: 'ai',
        originalAIText: text,
      })),
      humanDiscussion: {
        challenges: SAMPLE_WHITEBOARD_DATA.stage2.challenges,
        initialAIIdeas: SAMPLE_WHITEBOARD_DATA.stage2.initialAIIdeas,
        uploadedImages: [],
        rawTextNotes:
          'Executive Committee session on high-criticality component continuity and European logistics.',
        isConfirmed: true,
        confirmedAt: Date.now(),
      },
      exploration: SAMPLE_EXPLORATION_OUTPUT,
      humanReview: {
        reviews: {
          'opp-01': { opportunityId: 'opp-01', decision: 'KEEP', comment: 'Core foundation' },
          'opp-02': { opportunityId: 'opp-02', decision: 'KEEP', comment: 'Fast value' },
          'opp-03': { opportunityId: 'opp-03', decision: 'KEEP', comment: 'Zero risk drill' },
          'opp-04': { opportunityId: 'opp-04', decision: 'CHALLENGE', comment: 'Audit liability' },
          'opp-05': { opportunityId: 'opp-05', decision: 'KEEP', comment: 'Good visibility' },
          'opp-06': { opportunityId: 'opp-06', decision: 'DISCARD', comment: 'Premature' },
          'opp-07': { opportunityId: 'opp-07', decision: 'KEEP', comment: 'Useful' },
          'opp-08': { opportunityId: 'opp-08', decision: 'KEEP', comment: 'High value' },
        },
        whiteboardFeedback: null,
      },
      revisedPriorities: SAMPLE_REVISED_PRIORITIES,
      boardChallenge: SAMPLE_BOARD_CHALLENGE,
      finalDecision: {
        finalPriorities: [
          {
            rank: 1,
            name: 'Multi-Tier Supplier Disruption Radar',
            rationale:
              'Proactively detects tier-2 fabrication halts 14 days before breach by monitoring power and satellite indicators.',
            safeguardsAdopted: 'Procurement dual-signoff gate before vendor substitution.',
            timeframe: '<5 weeks',
          },
          {
            rank: 2,
            name: 'AI Dynamic Freight Rerouting & ETA Simulation',
            rationale:
              'Calculates alternate land/ocean shipping paths and pre-books capacity during port congestion.',
            safeguardsAdopted: 'Enforce $250k weekly budget cap on automated spot premiums.',
            timeframe: '<5 weeks',
          },
          {
            rank: 3,
            name: 'Synthetic Crisis Simulator & War-Gaming Playbooks',
            rationale:
              'Builds executive crisis response reflexes without backend ERP friction in <5 days.',
            safeguardsAdopted: 'Standalone zero-integration module to prevent operational disruption.',
            timeframe: '<5 days',
          },
        ],
        finalExecutiveRationale:
          'The executive committee has concluded a high-conviction decision framework focusing on real-time visibility, automated logistics agility, and low-friction organizational crisis readiness.',
        keyOpenQuestions: ['Regional API regulatory clearance by Q3'],
        confirmedAt: Date.now(),
        facilitatorSignoffNotes: 'All board objections resolved with adopted safeguards.',
      },

      chatHistory: [],
      interactions: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setSession(demoSession);
  };

  // --- Page 2 -> Page 3: Analyse Team Notes & Whiteboard Photo ---
  const handleAnalyseInput = async (textNotes: string, imageDataUrl?: string) => {
    setIsLoading(true);
    try {
      let extractedChallenges: string[] = [];
      let extractedIdeas: string[] = [];
      let foundUncertainties: string[] = [];

      if (imageDataUrl) {
        // Try calling backend API
        try {
          const res = await fetch('/api/workshop/extract-whiteboard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageDataUrl,
              userNotesHint: textNotes,
              workshopContext: session.context,
            }),
          });
          if (res.ok) {
            const data: ImageExtractionResult = await res.json();
            extractedChallenges = data.challenges || [];
            extractedIdeas = data.initialAIIdeas || [];
            foundUncertainties = data.uncertainties || [];
          }
        } catch (apiErr) {
          console.warn('API extraction failed, using fallback parser:', apiErr);
        }
      }

      const imageChallenges = extractedChallenges.filter(isSubstantiveChallenge);
      // Typed notes are an independent source and are always preserved and combined.
      if (textNotes.trim()) {
        const lines = textNotes
          .split('\n')
          .map((l) => l.replace(/^[-*•\d.]+\s*/, '').trim())
          .filter(isSubstantiveChallenge);

        if (lines.length > 0) {
          extractedChallenges = [...imageChallenges, ...lines];
        }
      }
      extractedChallenges = [...new Set(extractedChallenges.filter(isSubstantiveChallenge))];

      setUncertainties(foundUncertainties);

      const challengeSource = imageDataUrl ? 'ai' : textNotes.trim() ? 'human' : 'ai';
      const challengeEntities: WorkshopChallenge[] = extractedChallenges.map((text) => ({
        id: createResearchId('challenge'),
        text,
        source: challengeSource,
        ...(challengeSource === 'ai' ? { originalAIText: text } : {}),
      }));

      setSession((prev) => ({
        ...prev,
        currentStage: 3,
        mainStage: 'search',
        humanDiscussion: {
          ...prev.humanDiscussion,
          challenges: extractedChallenges,
          initialAIIdeas: extractedIdeas,
          rawTextNotes: textNotes,
          whiteboardExtractedChallenges: imageChallenges,
          isConfirmed: false,
        },
        challengeEntities,
        updatedAt: Date.now(),
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // --- Page 3 -> Page 4: Confirm Understanding & Explore Opportunities ---
  const handleConfirmUnderstanding = async (confirmedData: HumanDiscussionData) => {
    setIsLoading(true);
    try {
      let explorationResult: AIExplorationOutput | null = null;

      try {
        const res = await fetch('/api/workshop/explore-opportunities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            humanDiscussion: confirmedData,
            contextTitle: session.context.title,
            workshopContext: session.context,
          }),
        });
        if (res.ok) {
          explorationResult = await res.json();
        }
      } catch (e) {
        console.warn('Exploration API failed, using sample exploration fallback:', e);
      }

      if (!explorationResult) {
        explorationResult = SAMPLE_EXPLORATION_OUTPUT;
      }

      explorationResult = {
        ...explorationResult,
        opportunities: explorationResult.opportunities.map((opportunity) => ({
          ...opportunity,
          source: opportunity.source || 'ai',
          originalAIValue: opportunity.originalAIValue || { ...opportunity },
        })),
      };
      const longList = buildLongList(explorationResult.opportunities, confirmedData.challenges, session.context);

      setSession((prev) => ({
        ...prev,
        currentStage: 4,
        mainStage: 'representation',
        humanDiscussion: confirmedData,
        exploration: explorationResult,
        longList,
        updatedAt: Date.now(),
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // --- Page 4 -> Page 5: Confirm Top 3 & Prepare Stress Test ---
  const handleConfirmTop3 = async (reviewedDecisions: Record<string, ReviewDecision>) => {
    setIsLoading(true);
    try {
      let boardOutput: BoardChallengeOutput | null = null;
      const rankedTop3 = (session.exploration?.opportunities || []).slice(0, 3);
      let revisedOutput: RevisedPrioritiesOutput | null = {
        revisedPriorities: rankedTop3.map((opportunity, index) => ({ id: opportunity.id, rank: index + 1, originalOpportunityId: opportunity.id, originalName: opportunity.name, humanFeedbackSummary: 'Participant-ranked opportunity', revisedStrategicFocus: opportunity.strategicOpportunity, justification: opportunity.prioritizationRationale || opportunity.potentialValue || 'Selected by participants', status: opportunity.source === 'human' ? 'SUBSTITUTED' : 'CONFIRMED' })),
        executiveAlignmentRationale: 'Priorities reflect the latest participant ranking.', generatedAt: Date.now(), isConfirmed: true,
      };

      try {
        const revRes = await fetch('/api/workshop/synthesize-revised-priorities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            originalExploration: session.exploration || SAMPLE_EXPLORATION_OUTPUT,
            humanReviews: reviewedDecisions,
            workshopContext: session.context,
          }),
        });
        if (revRes.ok) {
          // Participant ranking is authoritative; AI synthesis must not replace identities or order.
          const synthesis: RevisedPrioritiesOutput = await revRes.json();
          revisedOutput = { ...synthesis, revisedPriorities: revisedOutput.revisedPriorities };
        }
      } catch (e) {
        console.warn('Revised priorities API failed:', e);
      }

      try {
        const boardRes = await fetch('/api/workshop/run-board-challenge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            revisedPriorities: revisedOutput || SAMPLE_REVISED_PRIORITIES,
            contextTitle: session.context.title,
            workshopContext: session.context,
          }),
        });
        if (boardRes.ok) {
          boardOutput = await boardRes.json();
        }
      } catch (e) {
        console.warn('Board challenge API failed:', e);
      }

      setSession((prev) => ({
        ...prev,
        currentStage: 5,
        mainStage: 'aggregation',
        humanReview: {
          ...prev.humanReview,
          reviews: reviewedDecisions,
        },
        revisedPriorities: revisedOutput || SAMPLE_REVISED_PRIORITIES,
        boardChallenge: boardOutput || SAMPLE_BOARD_CHALLENGE,
        updatedAt: Date.now(),
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // --- Page 5 -> Page 6: Generate Final Results ---
  const handleGenerateFinalResults = async () => {
    setIsLoading(true);
    try {
      // Build final decision object from confirmed priorities
      const p1Name =
        session.boardChallenge?.prioritiesChallenged[0]?.priorityName ||
        session.revisedPriorities?.revisedPriorities[0]?.originalName ||
        'Multi-Tier Supplier Disruption Radar';
      const p2Name =
        session.boardChallenge?.prioritiesChallenged[1]?.priorityName ||
        session.revisedPriorities?.revisedPriorities[1]?.originalName ||
        'AI Dynamic Freight Rerouting & ETA Simulation';
      const p3Name =
        session.boardChallenge?.prioritiesChallenged[2]?.priorityName ||
        session.revisedPriorities?.revisedPriorities[2]?.originalName ||
        'Synthetic Crisis Simulator & War-Gaming Playbooks';

      setSession((prev) => ({
        ...prev,
        currentStage: 6,
        mainStage: 'aggregation',
        finalDecision: {
          finalPriorities: [
            {
              rank: 1,
              name: p1Name,
              rationale:
                'Eliminates single-source Tier-2 chokepoints by tracking ambient shipping, power, and supplier signals.',
              pilotCost: '$$',
              pilotTimeline: '<5 weeks',
              boardApprovedSafeguard:
                'Procurement dual-signoff gate before vendor substitution.',
              mitigationStrategy:
                'Dual-source fallback contracts with regional European suppliers.',
            },
            {
              rank: 2,
              name: p2Name,
              rationale:
                'Predicts port delays with 94% accuracy and dynamically computes alternate multimodal landed costs.',
              pilotCost: '$$',
              pilotTimeline: '<5 weeks',
              boardApprovedSafeguard:
                'Enforce $250k weekly budget cap on automated spot premiums.',
              mitigationStrategy:
                'Establish pre-negotiated SLA buffer windows with 3PL partners.',
            },
            {
              rank: 3,
              name: p3Name,
              rationale:
                'Builds immediate executive muscle memory with zero ERP friction through synthetic scenario tabletop drills.',
              pilotCost: '$',
              pilotTimeline: '<5 days',
              boardApprovedSafeguard:
                'Standalone zero-integration module to prevent operational disruption.',
              mitigationStrategy:
                'Monthly cross-functional tabletop simulations with business continuity leaders.',
            },
          ],
          executiveSummary:
            'The executive committee has concluded a high-conviction decision framework focusing on real-time visibility, automated logistics agility, and low-friction organizational crisis readiness.',
          implementationRoadmap: [
            {
              phase: '0–5 Days',
              actions: ['Deploy Synthetic Crisis Simulator for board tabletop drill'],
            },
            {
              phase: 'Weeks 1–5',
              actions: [
                'Launch AI Freight Rerouting pilot with major logistics partners',
                'Connect ambient data feeds for Tier-2 supplier monitoring',
              ],
            },
            {
              phase: 'Months 2–5',
              actions: ['Enterprise rollout and board SLA governance review'],
            },
          ],
          unresolvedRisks: [],
          timestamp: Date.now(),
        },
        updatedAt: Date.now(),
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const currentStage = session.currentStage || 1;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased selection:bg-indigo-500 selection:text-white">
      {/* Universal Simplified Header */}
      <Header
        currentStage={currentStage}
        onSelectStage={(s) => setStage(s)}
        onReset={handleResetWorkshop}
        onLoadDemo={handleLoadDemoSession}
      />

      {/* Existing focused pages act as sub-steps within exactly three main stages. */}
      <main className="flex-1 flex flex-col">
        {isEditingContext ? (
          <WorkshopContextForm
            initialContext={session.context}
            onSave={handleSaveContext}
            onCancel={currentStage > 1 ? () => setIsEditingContext(false) : undefined}
          />
        ) : currentStage === 1 ? (
          <Page1Welcome onStart={() => setIsEditingContext(true)} />
        ) : null}

        {!isEditingContext && currentStage > 1 && (
          <WorkshopContextSummary context={session.context} onEdit={() => setIsEditingContext(true)} />
        )}

        {!isEditingContext && currentStage === 2 && (
          <Page2TeamThinking
            initialText={session.humanDiscussion.rawTextNotes}
            onAnalyse={handleAnalyseInput}
            isAnalysing={isLoading}
          />
        )}

        {!isEditingContext && currentStage === 3 && (
          <Page3ConfirmUnderstanding
            initialChallenges={session.challengeEntities || []}
            initialIdeas={session.humanDiscussion.initialAIIdeas}
            uncertainties={uncertainties}
            onConfirm={handleConfirmUnderstanding}
            onUploadAnother={() => setStage(2)}
            isProcessing={isLoading}
            onChallengesChange={updateChallenges}
            onInteraction={logInteraction}
            longList={session.longList || []}
          />
        )}

        {!isEditingContext && currentStage === 4 && (
          <Page4ExploreOpportunities
            opportunities={session.exploration?.opportunities || SAMPLE_EXPLORATION_OUTPUT.opportunities}
            onConfirmTop3={handleConfirmTop3}
            isSubmitting={isLoading}
            initialReviews={Object.fromEntries(
              Object.entries(session.humanReview?.reviews || {}).map(([id, review]) => [
                id,
                (review as { decision: ReviewDecision }).decision,
              ])
            )}
            onReviewsChange={(reviews) => setSession((prev) => ({
              ...prev,
              humanReview: {
                ...prev.humanReview,
                reviews: Object.fromEntries(Object.entries(reviews).map(([id, decision]) => [
                  id,
                  { opportunityId: id, decision, comment: prev.humanReview?.reviews[id]?.comment || '' },
                ])),
              },
              updatedAt: Date.now(),
            }))}
            onOpportunitiesChange={updateOpportunities}
            onInteraction={logInteraction}
          />
        )}

        {!isEditingContext && currentStage === 5 && (
          <Page5ChallengePriorities
            boardChallenge={session.boardChallenge || SAMPLE_BOARD_CHALLENGE}
            revisedPriorities={session.revisedPriorities || SAMPLE_REVISED_PRIORITIES}
            onGenerateFinalResults={handleGenerateFinalResults}
            isGenerating={isLoading}
          />
        )}

        {!isEditingContext && currentStage === 6 && (
          <Page6FinalResults
            session={session}
            onRestart={handleResetWorkshop}
          />
        )}
      </main>
      <footer className="border-t border-slate-200 bg-white px-6 py-4 text-center text-xs text-slate-500">
        <p>In Beta, developed in partnership with Cambridge Service Alliance and Cognitive Service Systems, Fraunhofer IAO.</p>
        <p className="mt-1 text-[10px] text-slate-400">Partner logo assets pending: <code>cambridge-service-alliance-logo</code> and <code>fraunhofer-iao-logo</code>.</p>
      </footer>
    </div>
  );
}
