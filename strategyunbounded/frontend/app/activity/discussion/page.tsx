'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import { api } from '@/lib/api'
import VoiceRecordButton from '@/components/VoiceRecordButton'
import GuideTooltip from '@/components/GuideTooltip'
import type { DiscussionEntry } from '@/lib/types'

export default function DiscussionPage() {
  const router = useRouter()
  const { sessionId, useCases } = useStore()
  const [entries, setEntries] = useState<DiscussionEntry[]>([])
  const [speakerLabel, setSpeakerLabel] = useState('')
  const [analysing, setAnalysing] = useState(false)
  const feedRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const priorityUcs = useCases.filter((u) => u.aiPriority !== null).sort((a, b) => (a.aiPriority ?? 9) - (b.aiPriority ?? 9))

  useEffect(() => {
    if (!sessionId) { router.replace('/'); return }

    // Initial fetch
    api.getDiscussionEntries(sessionId).then((r) => setEntries(r.entries)).catch(() => {})

    // Poll every 3 s for other participants' contributions
    pollRef.current = setInterval(() => {
      api.getDiscussionEntries(sessionId).then((r) => setEntries(r.entries)).catch(() => {})
    }, 3000)

    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [sessionId])

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' })
  }, [entries])

  async function handleTranscript(text: string) {
    if (!sessionId || !text.trim()) return
    const entry = await api.postDiscussionEntry(sessionId, text.trim(), speakerLabel.trim() || undefined)
    setEntries((prev) => [...prev, entry])
  }

  async function handleFinish() {
    if (!sessionId) return
    setAnalysing(true)
    try {
      const result = await api.analyseDiscussion(sessionId)
      useStore.getState().setSelectedUseCase(result.recommended_use_case_id)
      router.push('/activity/confirm')
    } catch {
      setAnalysing(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-70px)] px-4 md:px-10 py-8 flex flex-col gap-6 max-w-[800px] mx-auto w-full">
      <div>
        <h2 className="text-[clamp(1.4rem,3vw,2.2rem)] font-extrabold text-text-default">Group Discussion</h2>
        <p className="text-text-muted text-sm mt-1">
          Each person records their view on which use case to take forward. The AI will analyse the discussion and recommend the top choice.
        </p>
      </div>

      {/* Top 3 use cases for reference */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Top 3 Use Cases Under Discussion</p>
        {priorityUcs.map((uc) => (
          <div key={uc.id} className="flex items-start gap-3 bg-surface border border-border-brand rounded-xl px-4 py-3">
            <span className="w-6 h-6 rounded-full bg-gradient-action text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
              {uc.aiPriority}
            </span>
            <div>
              <p className="text-sm font-semibold text-text-default">{uc.title}</p>
              <p className="text-xs text-text-muted">{uc.summary}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Transcript feed */}
      <div
        ref={feedRef}
        className="flex-1 min-h-[160px] max-h-[300px] overflow-y-auto bg-surface border border-border-brand rounded-xl p-4 flex flex-col gap-3"
      >
        {entries.length === 0 ? (
          <p className="text-text-muted text-sm text-center my-auto">No contributions yet. Be the first to record.</p>
        ) : (
          entries.map((e) => (
            <div key={e.id} className="flex flex-col gap-0.5">
              {e.speakerLabel && (
                <span className="text-xs font-semibold text-violet-brand">{e.speakerLabel}</span>
              )}
              <p className="text-sm text-text-default bg-white border border-border-brand rounded-lg px-3 py-2">
                {e.transcript}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Record controls */}
      <div className="bg-surface border-2 border-border-brand rounded-2xl p-5 flex flex-col items-center gap-4">
        <input
          type="text"
          value={speakerLabel}
          onChange={(e) => setSpeakerLabel(e.target.value)}
          placeholder="Your name (optional)"
          className="w-full max-w-xs px-4 py-2 border border-border-brand rounded-xl text-sm text-text-default bg-page outline-none focus:border-indigo-brand transition"
        />
        <VoiceRecordButton onTranscript={handleTranscript} label="Hold to record your view" />
      </div>

      <button
        onClick={handleFinish}
        disabled={entries.length === 0 || analysing}
        className="self-end inline-flex items-center gap-2 px-6 py-3 bg-gradient-action text-white text-sm font-bold rounded-full hover:shadow-glow transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {analysing ? (
          <>
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Analysing…
          </>
        ) : (
          'Finish Discussion & Analyse →'
        )}
      </button>

      <GuideTooltip stage="discussion" />
    </div>
  )
}
