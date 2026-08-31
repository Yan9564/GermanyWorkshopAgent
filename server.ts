/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import {
  extractWhiteboardImage,
  generateAIOpportunities,
  extractWhiteboardFeedbackImage,
  synthesizeRevisedPriorities,
  runBoardChallenge,
  getFacilitatorStageResponse,
} from './server/geminiService';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Support large base64 image uploads from whiteboard photos
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      timestamp: Date.now(),
    });
  });

  // SEARCH / Identify Challenges: extract structured text from a whiteboard photo
  app.post('/api/workshop/extract-whiteboard', async (req, res) => {
    try {
      const { imageDataUrl, userNotesHint } = req.body;
      if (!imageDataUrl) {
        return res.status(400).json({ error: 'Missing imageDataUrl' });
      }
      const extraction = await extractWhiteboardImage(imageDataUrl, userNotesHint);
      res.json(extraction);
    } catch (error: any) {
      console.error('[API] /extract-whiteboard error:', error);
      res.status(500).json({ error: error.message || 'Failed to process whiteboard image' });
    }
  });

  // SEARCH / Explore AI Opportunities based on confirmed human challenges
  app.post('/api/workshop/explore-opportunities', async (req, res) => {
    try {
      const { humanDiscussion, contextTitle } = req.body;
      if (!humanDiscussion) {
        return res.status(400).json({ error: 'Missing humanDiscussion data' });
      }
      const output = await generateAIOpportunities(humanDiscussion, contextTitle || 'Service Continuity');
      res.json(output);
    } catch (error: any) {
      console.error('[API] /explore-opportunities error:', error);
      res.status(500).json({ error: error.message || 'Failed to generate AI opportunities' });
    }
  });

  // AGGREGATION / Review: extract whiteboard feedback from critique photo
  app.post('/api/workshop/extract-whiteboard-feedback', async (req, res) => {
    try {
      const { imageDataUrl, currentOpportunities } = req.body;
      if (!imageDataUrl) {
        return res.status(400).json({ error: 'Missing imageDataUrl' });
      }
      const feedback = await extractWhiteboardFeedbackImage(imageDataUrl, currentOpportunities);
      res.json(feedback);
    } catch (error: any) {
      console.error('[API] /extract-whiteboard-feedback error:', error);
      res.status(500).json({ error: error.message || 'Failed to extract whiteboard feedback' });
    }
  });

  // AGGREGATION / Review: synthesize priorities from Keep/Challenge/Discard feedback
  app.post('/api/workshop/synthesize-revised-priorities', async (req, res) => {
    try {
      const { originalExploration, humanReviews, whiteboardFeedback } = req.body;
      if (!originalExploration) {
        return res.status(400).json({ error: 'Missing originalExploration data' });
      }
      const revised = await synthesizeRevisedPriorities(
        originalExploration,
        humanReviews || {},
        whiteboardFeedback
      );
      res.json(revised);
    } catch (error: any) {
      console.error('[API] /synthesize-revised-priorities error:', error);
      res.status(500).json({ error: error.message || 'Failed to synthesize revised priorities' });
    }
  });

  // AGGREGATION / Stress Test: Board Challenge. Keep both route names for compatibility.
  const boardChallengeHandler = async (req: express.Request, res: express.Response) => {
    try {
      const { revisedPriorities, contextTitle } = req.body;
      if (!revisedPriorities) {
        return res.status(400).json({ error: 'Missing revisedPriorities data' });
      }
      const challengeOutput = await runBoardChallenge(
        revisedPriorities,
        contextTitle || 'Service Continuity'
      );
      res.json(challengeOutput);
    } catch (error: any) {
      console.error('[API] /board-challenge error:', error);
      res.status(500).json({ error: error.message || 'Failed to run Board Challenge' });
    }
  };
  app.post('/api/workshop/board-challenge', boardChallengeHandler);
  app.post('/api/workshop/run-board-challenge', boardChallengeHandler);

  // Facilitator Stage-Aware Assistant
  app.post('/api/workshop/facilitator-chat', async (req, res) => {
    try {
      const { stage, mainStage, substep, message, sessionState } = req.body;
      const reply = await getFacilitatorStageResponse(
        mainStage || Number(stage) || 'search',
        message || '',
        sessionState || {},
        substep
      );
      res.json({ reply });
    } catch (error: any) {
      console.error('[API] /facilitator-chat error:', error);
      res.status(500).json({ reply: 'Please follow the current stage instructions to proceed.' });
    }
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Strategy Unbounded] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
