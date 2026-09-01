const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || res.statusText)
  }
  return res.json()
}

export const api = {
  loginAdmin: (pin: string) =>
    req<{ role: string }>('/api/auth/admin', { method: 'POST', body: JSON.stringify({ pin }) }),

  getMe: () => req<{ role: string }>('/api/auth/me'),

  getSystemPrompt: () =>
    req<{ content: string; updatedAt: string }>('/api/system-prompt'),

  updateSystemPrompt: (content: string) =>
    req<{ content: string; updatedAt: string }>('/api/system-prompt', {
      method: 'PUT',
      body: JSON.stringify({ content }),
    }),

  resetSystemPrompt: () =>
    req<{ content: string; updatedAt: string }>('/api/system-prompt/reset', { method: 'POST' }),

  createSession: (problems: string[]) =>
    req<{ sessionId: string; problemIds: string[]; cached: boolean }>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ problems }),
    }),

  getSession: (id: string) =>
    req<import('./types').Session>(`/api/sessions/${id}`),

  patchVote: (sessionId: string, ucId: string, priority: number | null) =>
    req<{ useCaseId: string; userPriority: number | null; displaced: string | null }>(
      `/api/sessions/${sessionId}/use-cases/${ucId}/vote`,
      { method: 'PATCH', body: JSON.stringify({ priority }) }
    ),

  patchFeedback: (sessionId: string, ucId: string, feedback: string | null) =>
    req<{ useCaseId: string; feedback: string | null }>(
      `/api/sessions/${sessionId}/use-cases/${ucId}/feedback`,
      { method: 'PATCH', body: JSON.stringify({ feedback }) }
    ),

  getAvatarGuidance: (stage: string, context?: Record<string, unknown>) =>
    req<{ message: string; nextStep: string }>('/api/avatar/guidance', {
      method: 'POST',
      body: JSON.stringify({ stage, context }),
    }),

  exportUrl: (sessionId: string) => `${BASE}/api/sessions/${sessionId}/export/pptx`,

  textToSpeech: async (text: string, voice?: string): Promise<Blob> => {
    const res = await fetch(`${BASE}/api/voice/tts`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice }),
    })
    if (!res.ok) throw new Error('TTS failed')
    return res.blob()
  },

  speechToText: async (audioBlob: Blob): Promise<{ transcript: string }> => {
    const form = new FormData()
    form.append('audio', audioBlob, 'recording.webm')
    const res = await fetch(`${BASE}/api/voice/stt`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }))
      throw new Error(err.detail || res.statusText)
    }
    return res.json()
  },

  postDiscussionEntry: (sessionId: string, transcript: string, speakerLabel?: string) =>
    req<import('./types').DiscussionEntry>(`/api/sessions/${sessionId}/discussion`, {
      method: 'POST',
      body: JSON.stringify({ transcript, speaker_label: speakerLabel ?? null }),
    }),

  getDiscussionEntries: (sessionId: string) =>
    req<{ entries: import('./types').DiscussionEntry[] }>(`/api/sessions/${sessionId}/discussion`),

  analyseDiscussion: (sessionId: string) =>
    req<{ recommended_use_case_id: string; confidence: string; reasoning: string; key_themes: string[] }>(
      `/api/sessions/${sessionId}/stage2/discussion-analysis`,
      { method: 'POST', body: '{}' },
    ),

  generateStage2: (sessionId: string, useCaseId: string) =>
    req<{ stage2_id: string; status: string }>(
      `/api/sessions/${sessionId}/stage2/generate`,
      { method: 'POST', body: JSON.stringify({ use_case_id: useCaseId }) },
    ),

  getStage2: (sessionId: string) =>
    req<import('./types').Stage2Result>(`/api/sessions/${sessionId}/stage2`),

  addAnnotation: (sessionId: string, stage2Id: string, elementKey: string, comment: string) =>
    req<{ id: string }>(`/api/sessions/${sessionId}/stage2/annotations`, {
      method: 'POST',
      body: JSON.stringify({ stage2_id: stage2Id, element_key: elementKey, comment }),
    }),

  getAnnotations: (sessionId: string) =>
    req<{ annotations: import('./types').Annotation[] }>(`/api/sessions/${sessionId}/stage2/annotations`),
}
