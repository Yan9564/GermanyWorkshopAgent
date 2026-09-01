'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import { api } from '@/lib/api'
import GuideTooltip from '@/components/GuideTooltip'
import JourneyMapView from '@/components/JourneyMapView'
import DashboardView from '@/components/DashboardView'
import ImpactCanvasView from '@/components/ImpactCanvasView'
import PipelineView from '@/components/PipelineView'
import type { RepType, Stage2Result, Annotation } from '@/lib/types'

const REP_LABELS: Record<RepType, string> = {
  journey_map: 'Journey Map',
  dashboard: 'Dashboard',
  impact_canvas: 'Impact Canvas',
  pipeline: 'Pipeline',
}

export default function Stage2Page() {
  const router = useRouter()
  const { sessionId, setStage2 } = useStore()
  const [result, setResult] = useState<Stage2Result | null>(null)
  const [activeTab, setActiveTab] = useState<RepType | null>(null)
  const [annotationMode, setAnnotationMode] = useState(false)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [pendingComment, setPendingComment] = useState('')
  const [savingAnnotation, setSavingAnnotation] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const { voiceMuted } = useStore()
  const narrationPlayed = useRef(false)

  useEffect(() => {
    if (!sessionId) { router.replace('/'); return }

    async function fetchOnce() {
      try {
        const r = await api.getStage2(sessionId!)
        setResult(r)
        if (r.status === 'complete' && r.representation) {
          setStage2(r)
          setActiveTab(r.representation.primary_type)
          if (!narrationPlayed.current && !voiceMuted && r.representation.narration_script) {
            narrationPlayed.current = true
            api.textToSpeech(r.representation.narration_script)
              .then((blob) => { const a = new Audio(URL.createObjectURL(blob)); a.play() })
              .catch(() => {})
          }
          const ann = await api.getAnnotations(sessionId!)
          setAnnotations(ann.annotations)
          if (pollRef.current) clearInterval(pollRef.current)
        }
      } catch { /* stage2 not found yet - keep polling */ }
    }

    fetchOnce()
    pollRef.current = setInterval(fetchOnce, 3000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [sessionId])

  const annotationMap: Record<string, string> = Object.fromEntries(
    annotations.map((a) => [a.element_key, a.comment])
  )

  async function saveAnnotation() {
    if (!sessionId || !result?.stage2_id || !pendingKey || !pendingComment.trim()) return
    setSavingAnnotation(true)
    try {
      await api.addAnnotation(sessionId, result.stage2_id, pendingKey, pendingComment.trim())
      const updated = await api.getAnnotations(sessionId)
      setAnnotations(updated.annotations)
      setPendingKey(null)
      setPendingComment('')
    } finally {
      setSavingAnnotation(false)
    }
  }

  function handleAnnotate(key: string) {
    setPendingKey(key)
    setPendingComment(annotationMap[key] ?? '')
  }

  if (!result || result.status === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center gap-6 min-h-[calc(100vh-70px)]">
        <div className="w-12 h-12 border-4 border-violet-brand border-t-transparent rounded-full animate-spin" />
        <p className="text-text-muted text-sm">Building your representation…</p>
        <GuideTooltip stage="stage2_generating" />
      </div>
    )
  }

  if (result.status === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 min-h-[calc(100vh-70px)]">
        <p className="text-red-500 font-semibold">Representation generation failed.</p>
        <button onClick={() => router.push('/activity/confirm')} className="text-violet-brand text-sm hover:underline">
          ← Go back and try again
        </button>
      </div>
    )
  }

  const rep = result.representation!
  const allTabs: RepType[] = [rep.primary_type, ...rep.secondary_types]

  return (
    <div className="min-h-[calc(100vh-70px)] px-4 md:px-10 py-8 flex flex-col gap-6 max-w-[1100px] mx-auto w-full">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-[clamp(1.4rem,3vw,2.2rem)] font-extrabold text-text-default">Stage 2 · Representation</h2>
          <p className="text-text-muted text-sm mt-1">
            {result.discussion_reasoning && (
              <span className="italic">{result.discussion_reasoning}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setAnnotationMode((v) => !v); setPendingKey(null) }}
            className={`inline-flex items-center gap-2 px-4 py-2 border-2 rounded-full text-sm font-semibold transition
              ${annotationMode ? 'border-violet-brand bg-violet-50 text-violet-brand' : 'border-border-brand text-text-muted hover:border-violet-brand'}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            {annotationMode ? 'Done Annotating' : 'Annotate'}
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 border-b border-border-brand">
        {allTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition -mb-px
              ${activeTab === tab
                ? 'border-violet-brand text-violet-brand'
                : 'border-transparent text-text-muted hover:text-text-default'}`}
          >
            {REP_LABELS[tab]}
            {tab === rep.primary_type && (
              <span className="ml-1.5 text-[0.6rem] font-bold text-white bg-violet-brand rounded-full px-1.5 py-0.5">
                Primary
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Annotation mode banner */}
      {annotationMode && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2 text-sm text-yellow-700 font-medium">
          Annotation mode: click any element to add a comment.
        </div>
      )}

      {/* Annotation popover */}
      {pendingKey && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setPendingKey(null)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold text-text-default">Add annotation</p>
            <p className="text-xs text-text-muted font-mono">{pendingKey}</p>
            <textarea
              value={pendingComment}
              onChange={(e) => setPendingComment(e.target.value)}
              rows={3}
              placeholder="Your comment…"
              className="w-full border border-border-brand rounded-xl px-3 py-2 text-sm outline-none focus:border-violet-brand"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setPendingKey(null)} className="text-sm text-text-muted hover:text-text-default">Cancel</button>
              <button
                onClick={saveAnnotation}
                disabled={savingAnnotation || !pendingComment.trim()}
                className="px-4 py-1.5 bg-gradient-action text-white text-sm font-bold rounded-full disabled:opacity-50"
              >
                {savingAnnotation ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visualization */}
      <div className="bg-surface border border-border-brand rounded-2xl p-6">
        {activeTab === 'journey_map' && rep.journey_map && (
          <JourneyMapView
            data={rep.journey_map}
            annotationMode={annotationMode}
            annotations={annotationMap}
            onAnnotate={handleAnnotate}
          />
        )}
        {activeTab === 'dashboard' && rep.dashboard && (
          <DashboardView
            data={rep.dashboard}
            annotationMode={annotationMode}
            annotations={annotationMap}
            onAnnotate={handleAnnotate}
          />
        )}
        {activeTab === 'impact_canvas' && rep.impact_canvas && (
          <ImpactCanvasView
            data={rep.impact_canvas}
            annotationMode={annotationMode}
            annotations={annotationMap}
            onAnnotate={handleAnnotate}
          />
        )}
        {activeTab === 'pipeline' && rep.pipeline && (
          <PipelineView
            data={rep.pipeline}
            annotationMode={annotationMode}
            annotations={annotationMap}
            onAnnotate={handleAnnotate}
          />
        )}
      </div>

      {annotations.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Annotations ({annotations.length})</p>
          {annotations.map((a) => (
            <div key={a.id} className="flex gap-3 text-sm bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2">
              <span className="text-yellow-600 font-mono text-xs flex-shrink-0 mt-0.5">{a.element_key}</span>
              <span className="text-text-default">{a.comment}</span>
            </div>
          ))}
        </div>
      )}

      <GuideTooltip stage={annotationMode ? 'stage2_annotating' : 'stage2_view'} />
    </div>
  )
}
