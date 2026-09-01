import type { UseCase } from './types'

interface StreamCallbacks {
  onStatus: (message: string) => void
  onProblemDone: (problemIndex: number, useCases: UseCase[]) => void
  onDone: (sessionId: string, priorities: Record<string, string>) => void
  onProblemError: (problemIndex: number, message: string) => void
  onError: (message: string) => void
  onStreamClose?: () => void
}

export function openBrainstormStream(sessionId: string, callbacks: StreamCallbacks): () => void {
  const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  const controller = new AbortController()
  let buffer = ''

  function parseAndDispatch(chunk: string) {
    buffer += chunk
    const blocks = buffer.split('\n\n')
    buffer = blocks.pop() ?? ''
    for (const block of blocks) {
      if (!block.trim()) continue
      const lines = block.split('\n')
      let eventName = 'message'
      let dataStr = ''
      for (const line of lines) {
        if (line.startsWith('event:')) eventName = line.slice(6).trim()
        else if (line.startsWith('data:')) dataStr = line.slice(5).trim()
      }
      if (!dataStr) continue
      try {
        const data = JSON.parse(dataStr)
        console.log('[SSE] event:', eventName, data)
        if (eventName === 'status') {
          callbacks.onStatus(data.message)
        } else if (eventName === 'problem_done') {
          console.log('[SSE] problem_done — problemIndex:', data.problemIndex, 'useCases:', data.useCases?.length)
          callbacks.onProblemDone(data.problemIndex, data.useCases)
        } else if (eventName === 'done') {
          console.log('[SSE] done — sessionId:', data.sessionId, 'priorities:', data.priorities)
          callbacks.onDone(data.sessionId, data.priorities ?? {})
        } else if (eventName === 'problem_error') {
          console.warn('[SSE] problem_error — problemIndex:', data.problemIndex, 'msg:', data.message)
          callbacks.onProblemError(data.problemIndex, data.message)
        } else if (eventName === 'error') {
          console.error('[SSE] error —', data.message)
          callbacks.onError(data.message)
        }
      } catch {
        // ignore malformed SSE lines
      }
    }
  }

  async function run() {
    console.log('[SSE] Fetching brainstorm stream for sessionId:', sessionId)
    try {
      const res = await fetch(`${BASE}/api/brainstorm`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
        signal: controller.signal,
      })
      console.log('[SSE] Response status:', res.status, res.ok ? 'OK' : 'FAIL')
      if (!res.ok || !res.body) {
        callbacks.onError('Failed to connect to brainstorm stream')
        return
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let chunkCount = 0
      while (true) {
        const { done, value } = await reader.read()
        if (done) { console.log('[SSE] Stream closed after', chunkCount, 'chunks'); break }
        chunkCount++
        parseAndDispatch(decoder.decode(value, { stream: true }))
      }
      // Flush any SSE event that arrived without a trailing blank line
      if (buffer.trim()) {
        console.log('[SSE] Flushing remaining buffer on stream close')
        parseAndDispatch('\n\n')
      }
      callbacks.onStreamClose?.()
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') {
        console.error('[SSE] Fetch error:', e.message)
        callbacks.onError(e.message)
      }
    }
  }

  run()
  return () => controller.abort()
}
