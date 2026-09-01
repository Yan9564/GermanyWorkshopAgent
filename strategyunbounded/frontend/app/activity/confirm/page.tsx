'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import { api } from '@/lib/api'
import GuideTooltip from '@/components/GuideTooltip'
import type { UseCase } from '@/lib/types'

export default function ConfirmPage() {
  const router = useRouter()
  const { sessionId, useCases, selectedUseCaseId, setSelectedUseCase, loadSession } = useStore()
  const [reasoning, setReasoning] = useState('')
  const [confidence, setConfidence] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState('')
  const [showAlternatives, setShowAlternatives] = useState(false)
  // Fresh data from the API — guaranteed to have correct session-scoped IDs
  const [apiPriorityUcs, setApiPriorityUcs] = useState<UseCase[]>([])

  // Prefer API-fetched use cases; fall back to store only while loading
  const priorityUcs = apiPriorityUcs.length > 0
    ? apiPriorityUcs
    : useCases.filter((u) => u.aiPriority !== null).sort((a, b) => (a.aiPriority ?? 9) - (b.aiPriority ?? 9))

  const recommended = priorityUcs.find((u) => u.id === selectedUseCaseId) ?? priorityUcs[0]
  const alternatives = priorityUcs.filter((u) => u.id !== recommended?.id)

  useEffect(() => {
    if (!sessionId) { router.replace('/'); return }

    // Always load fresh session data — the store may have stale priorities from a prior session
    api.getSession(sessionId).then((s) => {
      const allUcs = s.problems.flatMap((p) => p.useCases)
      const pUcs = allUcs
        .filter((u) => u.aiPriority !== null)
        .sort((a, b) => (a.aiPriority ?? 9) - (b.aiPriority ?? 9))
      setApiPriorityUcs(pUcs)
      loadSession(s.problems.map((p) => p.text), allUcs)
    }).catch(() => {})

    api.analyseDiscussion(sessionId)
      .then((r) => {
        setReasoning(r.reasoning)
        setConfidence(r.confidence)
        setSelectedUseCase(r.recommended_use_case_id)
      })
      .catch(() => {})
  }, [sessionId])

  async function handleConfirm(ucId: string) {
    if (!sessionId) return
    setGenerating(true)
    setGenerateError('')
    try {
      await api.generateStage2(sessionId, ucId)
      router.push('/activity/stage2')
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : 'Failed to start generation. Please try again.')
      setGenerating(false)
    }
  }

  function ConfidenceBadge({ level }: { level: string }) {
    const colours: Record<string, string> = {
      high: 'bg-green-100 text-green-700',
      medium: 'bg-yellow-100 text-yellow-700',
      low: 'bg-red-100 text-red-600',
    }
    return (
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colours[level] ?? 'bg-tint text-text-muted'}`}>
        {level ? level.charAt(0).toUpperCase() + level.slice(1) + ' confidence' : ''}
      </span>
    )
  }

  function UCCard({ uc, primary }: { uc: UseCase; primary?: boolean }) {
    return (
      <div className={`bg-surface border-2 rounded-2xl p-5 ${primary ? 'border-violet-brand' : 'border-border-brand'}`}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="font-bold text-text-default">{uc.title}</p>
            <p className="text-sm text-text-muted mt-0.5">{uc.summary}</p>
          </div>
          <span className="flex-shrink-0 text-xs font-semibold text-text-muted border border-border-brand rounded-full px-2 py-0.5">
            {uc.complexity}
          </span>
        </div>
        <button
          onClick={() => handleConfirm(uc.id)}
          disabled={generating}
          className={`w-full py-2.5 text-sm font-bold rounded-full transition ${
            primary
              ? 'bg-gradient-action text-white hover:shadow-glow'
              : 'border-2 border-violet-brand text-violet-brand hover:bg-violet-50'
          } disabled:opacity-50`}
        >
          {generating ? 'Starting…' : primary ? 'Yes, use this →' : 'Use this instead →'}
        </button>
      </div>
    )
  }

  if (!recommended) {
    return <div className="flex items-center justify-center min-h-[calc(100vh-70px)] text-text-muted">Loading…</div>
  }

  return (
    <div className="min-h-[calc(100vh-70px)] px-4 md:px-10 py-8 flex flex-col gap-6 max-w-[700px] mx-auto w-full">
      <div>
        <h2 className="text-[clamp(1.4rem,3vw,2.2rem)] font-extrabold text-text-default">AI Recommendation</h2>
        <p className="text-text-muted text-sm mt-1">Based on your group discussion, here's what the team converged on.</p>
      </div>

      {reasoning && (
        <div className="bg-surface border border-border-brand rounded-xl p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">AI Reasoning</span>
            {confidence && <ConfidenceBadge level={confidence} />}
          </div>
          <p className="text-sm text-text-default leading-relaxed">{reasoning}</p>
        </div>
      )}

      {generateError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
          {generateError}
        </div>
      )}

      <UCCard uc={recommended} primary />

      <button
        onClick={() => setShowAlternatives((v) => !v)}
        className="text-sm text-violet-brand font-semibold hover:underline self-start"
      >
        {showAlternatives ? '▲ Hide alternatives' : '▼ Choose a different one'}
      </button>

      {showAlternatives && (
        <div className="flex flex-col gap-3">
          {alternatives.map((uc) => (
            <UCCard key={uc.id} uc={uc} />
          ))}
        </div>
      )}

      <GuideTooltip stage="confirm_use_case" />
    </div>
  )
}
