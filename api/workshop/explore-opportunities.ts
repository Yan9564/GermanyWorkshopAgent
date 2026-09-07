import type { Request, Response } from 'express';
import { generateAIOpportunities } from '../../server/geminiService';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { humanDiscussion, contextTitle, workshopContext, challengeEntities } = req.body || {};
  if (!humanDiscussion || !Array.isArray(humanDiscussion.challenges)) {
    return res.status(400).json({ error: 'Missing or invalid humanDiscussion data' });
  }
  try {
    const manuallyEditedChallenges = Array.isArray(challengeEntities)
      ? challengeEntities.map((challenge: { text?: unknown }) => challenge?.text)
        .filter((text: unknown): text is string => typeof text === 'string' && Boolean(text.trim()))
      : [];
    const output = await generateAIOpportunities(
      humanDiscussion,
      contextTitle || workshopContext?.title || 'AI opportunity exploration',
      workshopContext,
      manuallyEditedChallenges,
    );
    return res.status(200).json(output);
  } catch (error) {
    console.error('[API] /api/workshop/explore-opportunities failed', error);
    return res.status(500).json({ error: 'Failed to generate AI opportunities' });
  }
}
