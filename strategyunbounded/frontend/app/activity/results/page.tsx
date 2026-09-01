'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import { api } from '@/lib/api'
import UseCaseCard from '@/components/UseCaseCard'
import UseCaseModal from '@/components/UseCaseModal'
import GuideTooltip from '@/components/GuideTooltip'
import type { UseCase } from '@/lib/types'

export default function ResultsPage() {
  const router = useRouter()
  const { sessionId, problems, useCases, setStep, loadSession } = useStore()
  const [open, setOpen] = useState<Record<number, boolean>>({ 0: true, 1: true, 2: true, 3: true, 4: true })
  const [modal, setModal] = useState<{ uc: UseCase; problemText: string } | null>(null)
  const [recovering, setRecovering] = useState(false)
  const votesChangedCount = useCases.filter((u) => u.userPriority !== u.aiPriority).length

  useEffect(() => {
    console.log('[RESULTS] Mount — sessionId:', sessionId, 'problems:', problems.length, 'useCases:', useCases.length)
    setStep(4)
    if (!sessionId) { router.replace('/'); return }
    if (useCases.length === 0 || problems.length === 0) {
      console.log('[RESULTS] Store incomplete (useCases:', useCases.length, 'problems:', problems.length, ') — recovering from API')
      setRecovering(true)
      api.getSession(sessionId).then((s) => {
        const recovered = s.problems.flatMap((p) => p.useCases)
        console.log('[RESULTS] Recovered', recovered.length, 'use cases from API')
        loadSession(s.problems.map((p) => p.text), recovered)
        setRecovering(false)
      }).catch(() => router.replace('/'))
    }
  }, [sessionId])

  function byProblem(idx: number) {
    return useCases.filter((u) => u.problemIndex === idx)
  }

  if (recovering) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-70px)] text-text-muted">
        Recovering your session…
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-70px)] px-4 md:px-10 py-8 flex flex-col gap-6">
      <div className="max-w-[1200px] w-full mx-auto flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-[clamp(1.6rem,3.5vw,2.6rem)] font-extrabold text-text-default">Your AI Use Cases</h2>
          <p className="text-text-muted text-sm mt-1">15 opportunities identified. Explore, vote, and flag the ones that excite you.</p>
        </div>
        {sessionId && (
          <div className="flex items-center gap-3 flex-wrap">
            <a
              href={api.exportUrl(sessionId)}
              download
              className="inline-flex items-center gap-2 px-5 py-2.5 border-2 border-violet-brand text-violet-brand text-sm font-bold rounded-full hover:bg-violet-brand hover:text-white transition"
            >
              ↓ Download PPT
            </a>
            <button
              onClick={() => router.push('/activity/discussion')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-action text-white text-sm font-bold rounded-full hover:shadow-glow transition"
            >
              Start Group Discussion →
            </button>
          </div>
        )}
      </div>

      <div className="max-w-[1200px] w-full mx-auto flex flex-col gap-4">
        {problems.map((problemText, pi) => (
          <div key={pi}>
            <button
              onClick={() => setOpen((prev) => ({ ...prev, [pi]: !prev[pi] }))}
              className="w-full flex items-center gap-3 bg-surface border-2 border-border-brand rounded-2xl px-5 py-4 hover:border-indigo-brand hover:shadow-card transition-all"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-action text-white font-extrabold text-sm flex items-center justify-center flex-shrink-0">
                {pi + 1}
              </div>
              <div className="flex-1 text-left text-sm md:text-base font-semibold text-text-default">
                {problemText.length > 80 ? problemText.slice(0, 80) + '…' : problemText}
              </div>
              <span className={`text-violet-brand font-bold text-lg transition-transform duration-300 ${open[pi] ? 'rotate-180' : ''}`}>▼</span>
            </button>
            <div className={`overflow-hidden transition-[max-height,margin] duration-300 ease-in-out ${open[pi] ? 'max-h-[2000px] mt-3 mb-2' : 'max-h-0'}`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {byProblem(pi).map((uc) => (
                  <UseCaseCard
                    key={uc.id}
                    uc={uc}
                    sessionId={sessionId!}
                    onClick={() => setModal({ uc, problemText })}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <UseCaseModal
          uc={modal.uc}
          problemText={modal.problemText}
          sessionId={sessionId!}
          onClose={() => setModal(null)}
        />
      )}

      <GuideTooltip
        stage={votesChangedCount > 0 ? 'results_with_votes' : 'results_overview'}
        context={{ votesChangedCount }}
      />
    </div>
  )
}
