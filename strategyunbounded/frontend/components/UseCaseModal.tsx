'use client'
import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import { api } from '@/lib/api'
import PriorityBadge from './PriorityBadge'
import VoteButtons from './VoteButtons'
import type { UseCase } from '@/lib/types'

interface Props {
  uc: UseCase | null
  problemText: string
  sessionId: string
  onClose: () => void
}

const complexityClass: Record<string, string> = {
  Low: 'bg-green-100 border-green-brand text-green-brand',
  Medium: 'bg-amber-100 border-amber-brand text-amber-brand',
  High: 'bg-red-100 border-red-brand text-red-brand',
}

export default function UseCaseModal({ uc, problemText, sessionId, onClose }: Props) {
  const setFeedbackLocal = useStore((s) => s.setFeedbackLocal)
  const useCases = useStore((s) => s.useCases)
  const live = uc ? useCases.find((u) => u.id === uc.id) ?? uc : null
  const [guideText, setGuideText] = useState('')
  const [guideOpen, setGuideOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  if (!live) return null

  async function toggleFeedback(type: 'up' | 'down') {
    if (!live) return
    const next = live.feedback === type ? null : type
    setFeedbackLocal(live.id, next)
    try {
      await api.patchFeedback(sessionId, live.id, next)
    } catch {
      setFeedbackLocal(live.id, live.feedback)
    }
    if (!guideOpen) {
      api.getAvatarGuidance('card_detail_with_feedback').then((r) => {
        setGuideText(r.message)
      }).catch(() => {})
    }
  }

  async function toggleGuide() {
    setGuideOpen((v) => !v)
    if (!guideText) {
      const r = await api.getAvatarGuidance('card_detail').catch(() => ({ message: 'Keep exploring!', nextStep: '' }))
      setGuideText(r.message)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-[rgba(20,20,32,0.55)] z-[1000] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-surface rounded-xl3 shadow-modal w-full max-w-2xl max-h-[90vh] overflow-y-auto relative animate-slide-up">
        <div className="h-1.5 bg-gradient-action rounded-t-xl3" />
        <div className="px-6 pt-5 pb-4 border-b border-[#EDE9FE] relative">
          <div className="text-xl md:text-2xl font-extrabold text-text-default pr-20 leading-tight">
            {live.title}
          </div>
          <div className="text-xs font-medium text-text-muted mt-1">
            Re: {problemText.slice(0, 60)}{problemText.length > 60 ? '…' : ''}
          </div>
          {live.alsoAddresses && live.alsoAddresses.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {live.alsoAddresses.map((idx) => (
                <span
                  key={idx}
                  className="text-[0.7rem] px-2 py-0.5 rounded-full bg-tint text-indigo-brand border border-border-brand"
                >
                  Also solves P{idx + 1}
                </span>
              ))}
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-tint text-violet-brand font-bold flex items-center justify-center hover:bg-violet-brand hover:text-white transition"
          >✕</button>
          <button
            onClick={toggleGuide}
            className="absolute top-4 right-16 w-8 h-8 rounded-full bg-gradient-action text-white flex items-center justify-center text-sm font-bold"
            title="Guide"
          >?</button>
          {guideOpen && guideText && (
            <div className="mt-3 p-3 bg-tint border border-border-brand rounded-xl text-sm text-text-default leading-relaxed">
              {guideText}
            </div>
          )}
        </div>
        <div className="p-6 flex flex-col gap-6">
          {live.userPriority && (
            <div className="flex items-center gap-2">
              <PriorityBadge priority={live.userPriority} size="md" />
              <VoteButtons ucId={live.id} sessionId={sessionId} userPriority={live.userPriority} />
            </div>
          )}

          <ModalSection title="Description">
            <p className="text-sm text-text-default leading-relaxed">{live.description}</p>
          </ModalSection>

          <ModalSection title="How It Works">
            <ul className="flex flex-col gap-1.5">
              {live.howItWorks.map((step, i) => (
                <li key={i} className="flex gap-2 text-sm text-text-default leading-relaxed">
                  <span className="text-violet-brand text-[0.65rem] mt-1 flex-shrink-0">◆</span>
                  {step}
                </li>
              ))}
            </ul>
          </ModalSection>

          <ModalSection title="Data Required">
            <p className="text-sm text-text-default leading-relaxed">{live.dataRequired}</p>
          </ModalSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ModalSection title="Time to Implement">
              <p className="text-sm text-text-default font-mono">{live.timeToImplement}</p>
            </ModalSection>
            <ModalSection title="Complexity">
              <div className="flex gap-2 flex-wrap">
                {(['Low', 'Medium', 'High'] as const).map((c) => (
                  <span
                    key={c}
                    className={`px-3 py-1 rounded-full text-[0.75rem] font-mono font-medium border-2 ${
                      c === live.complexity ? complexityClass[c] : 'border-border-brand text-text-muted bg-page'
                    }`}
                  >{c}</span>
                ))}
              </div>
            </ModalSection>
          </div>

          <ModalSection title="Estimated Cost & ROI">
            <p className="text-sm text-text-default font-mono leading-relaxed">{live.estimatedCostRoi}</p>
          </ModalSection>

          <div className="border-t border-[#EDE9FE] pt-5">
            <div className="font-bold text-text-default mb-3 text-sm">Is this use case interesting?</div>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => toggleFeedback('up')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full border-2 font-semibold text-sm transition-all ${
                  live.feedback === 'up' ? 'bg-rose-brand border-rose-brand text-white' : 'border-border-brand text-text-muted hover:border-violet-brand hover:text-violet-brand'
                }`}
              >👍 Interesting!</button>
              <button
                onClick={() => toggleFeedback('down')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full border-2 font-semibold text-sm transition-all ${
                  live.feedback === 'down' ? 'bg-red-brand border-red-brand text-white' : 'border-border-brand text-text-muted hover:border-violet-brand hover:text-violet-brand'
                }`}
              >👎 Not relevant</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ModalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2.5 h-2.5 rounded-full bg-violet-brand flex-shrink-0" />
        <span className="text-sm font-bold text-indigo-brand">{title}</span>
      </div>
      {children}
    </div>
  )
}
