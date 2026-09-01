'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import BenjaminAvatar from '@/components/BenjaminAvatar'
import SpeechBubble from '@/components/SpeechBubble'
import { useStore } from '@/lib/store'
import { api } from '@/lib/api'
import { openBrainstormStream } from '@/lib/brainstorm-stream'

const MESSAGES = [
  'Thinking about your challenges…',
  'Our agents are brainstorming…',
  'Finding the best AI applications…',
  'Almost ready for you…',
]

type StepState = 'pending' | 'active' | 'done'

function StepIcon({ state }: { state: StepState }) {
  if (state === 'done') return <div className="w-6 h-6 rounded-full bg-green-100 text-green-brand flex items-center justify-center text-sm font-bold flex-shrink-0">✓</div>
  if (state === 'active') return <div className="w-6 h-6 rounded-full bg-tint text-violet-brand flex items-center justify-center text-sm animate-spin flex-shrink-0">↻</div>
  return <div className="w-6 h-6 rounded-full bg-tint text-text-muted flex items-center justify-center text-sm flex-shrink-0">○</div>
}

export default function ProcessingPage() {
  const router = useRouter()
  const { sessionId, addUseCasesForProblem, applyPriorities, setStep, completedProblemIndexes } = useStore()
  const [msgIndex, setMsgIndex] = useState(0)
  const [liveStatus, setLiveStatus] = useState('')
  const [steps, setSteps] = useState<[StepState, StepState, StepState]>(['pending', 'pending', 'pending'])
  const [errors, setErrors] = useState<Record<number, string>>({})
  const [streamError, setStreamError] = useState('')
  const didStart = useRef(false)
  const doneFired = useRef(false)

  useEffect(() => {
    if (!sessionId) { router.replace('/'); return }
    if (didStart.current) return
    didStart.current = true

    const msgInterval = setInterval(() => setMsgIndex((i) => (i + 1) % MESSAGES.length), 3000)
    let streamCleanup: (() => void) | null = null

    function startStream() {
      streamCleanup = openBrainstormStream(sessionId!, {
        onStatus: (msg) => setLiveStatus(msg),
        onProblemDone: (problemIndex, useCases) => {
          console.log('[PROCESSING] onProblemDone — problemIndex:', problemIndex, 'useCases:', useCases.length)
          addUseCasesForProblem(problemIndex, useCases)
          setSteps(([s1, s2, s3]) => [
            s1 === 'pending' ? 'done' : s1,
            s2 === 'pending' ? 'active' : s2,
            s3,
          ])
        },
        onDone: (_sid, priorities) => {
          console.log('[PROCESSING] onDone — priorities:', priorities)
          doneFired.current = true
          applyPriorities(priorities)
          setSteps(['done', 'done', 'done'])
          clearInterval(msgInterval)
          setTimeout(() => {
            setStep(4)
            router.push('/activity/results')
          }, 800)
        },
        onProblemError: (idx, msg) => {
          console.warn('[PROCESSING] onProblemError — idx:', idx, 'msg:', msg)
          setErrors((prev) => ({ ...prev, [idx]: msg }))
        },
        onError: (msg) => {
          console.error('[PROCESSING] onError —', msg)
          clearInterval(msgInterval)
          if (msg === 'Session already processed' || msg === 'Brainstorm already ran for this session') {
            setStep(4)
            router.replace('/activity/results')
            return
          }
          setStreamError(msg)
        },
        onStreamClose: () => {
          if (doneFired.current) return
          console.log('[PROCESSING] Stream closed without done event — checking session status')
          api.getSession(sessionId!).then((s) => {
            if (s.status === 'complete') {
              console.log('[PROCESSING] Session complete after stream close — navigating to results')
              clearInterval(msgInterval)
              const allUcs = s.problems.flatMap((p) => p.useCases)
              const priMap: Record<string, string> = {}
              allUcs.forEach((u) => { if (u.aiPriority !== null) priMap[String(u.aiPriority)] = u.id })
              applyPriorities(priMap)
              setStep(4)
              router.push('/activity/results')
            }
          }).catch(() => {})
        },
      })
    }

    api.getSession(sessionId).then((s) => {
      if (s.status === 'complete') {
        clearInterval(msgInterval)
        setStep(4)
        router.replace('/activity/results')
      } else {
        startStream()
      }
    }).catch(() => startStream())

    return () => {
      if (streamCleanup) streamCleanup()
      clearInterval(msgInterval)
    }
  }, [sessionId])

  const [s1, s2, s3] = steps

  return (
    <div className="min-h-[calc(100vh-70px)] flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-8 max-w-md w-full">
        <div className="flex flex-col items-center gap-4">
          <BenjaminAvatar height="clamp(120px,18vh,180px)" />
          <SpeechBubble text={liveStatus || MESSAGES[msgIndex]} arrowSide="bottom" className="max-w-xs text-center" textClassName="font-bold text-indigo-brand" />
        </div>

        <div className="bg-surface border-2 border-border-brand rounded-xl2 p-6 w-full flex flex-col gap-4">
          {([
            ['Challenges analysed', s1],
            ['AI use cases generating', s2],
            ['Priority ranking pending', s3],
          ] as [string, StepState][]).map(([label, state]) => (
            <div key={label} className={`flex items-center gap-4 text-sm font-semibold transition-colors ${state === 'done' ? 'text-green-brand' : state === 'active' ? 'text-indigo-brand' : 'text-text-muted'}`}>
              <StepIcon state={state} />
              {label}
            </div>
          ))}
        </div>

        <svg width="80" height="80" viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 0 8px rgba(15,82,212,0.28))' }}>
          <defs>
            <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0A3DBF" />
              <stop offset="100%" stopColor="#0F52D4" />
            </linearGradient>
          </defs>
          <circle fill="none" stroke="#E6E2DA" strokeWidth="8" cx="50" cy="50" r="45" />
          <circle
            fill="none" stroke="url(#ringGrad)" strokeWidth="8" strokeLinecap="round"
            cx="50" cy="50" r="45" transform="rotate(-90 50 50)"
            strokeDasharray="283"
            strokeDashoffset={283 - (283 * Math.min(completedProblemIndexes.length / 5, 1))}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>

        {Object.entries(errors).map(([idx, msg]) => (
          <p key={idx} className="text-red-brand text-xs">Problem {Number(idx) + 1}: {msg}</p>
        ))}
        {streamError && (
          <div className="text-red-brand text-sm text-center">
            <p>Stream error: {streamError}</p>
            <button
              onClick={() => { didStart.current = false; window.location.reload() }}
              className="mt-2 underline text-violet-brand"
            >Retry</button>
          </div>
        )}
      </div>
    </div>
  )
}
