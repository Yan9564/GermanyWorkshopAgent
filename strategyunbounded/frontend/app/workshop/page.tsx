'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import BenjaminAvatar from '@/components/BenjaminAvatar'
import SpeechBubble from '@/components/SpeechBubble'
import ThinkingDots from '@/components/ThinkingDots'
import PrimaryButton from '@/components/PrimaryButton'
import { useStore } from '@/lib/store'

const SPEECH =
  'Welcome to Stage 1 — Search. Traditional strategy cycles surface only a handful of options, leaving the vast majority of the possibility space unexplored. Your task today is to identify five real challenges your organisation faces — operational, structural, or strategic. Once you submit them, our AI agents will scan the landscape in parallel across multiple strategic lenses, surfacing targeted use cases you would not have reached through conventional brainstorming. Take a moment to reflect. When you are ready, begin.'

export default function WorkshopIntroPage() {
  const router = useRouter()
  const setStep = useStore((s) => s.setStep)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setStep(1)
  }, [])

  function handleBegin() {
    setStep(2)
    router.push('/activity')
  }

  return (
    <div className="min-h-[calc(100vh-70px)] flex items-center justify-center px-4 md:px-10 py-10">
      <div className="flex flex-wrap items-center gap-10 md:gap-16 max-w-[1200px] w-full mx-auto">
        <div className="flex-1 min-w-[280px] flex flex-col gap-5">
          <p className="text-[0.75rem] font-semibold tracking-[0.12em] uppercase text-bright">
            Stage 1 · Search
          </p>
          <h1 className="font-serif italic text-[clamp(2rem,4.5vw,3.8rem)] text-text-default leading-[1.1] tracking-tight">
            Scanning the landscape for AI opportunities.
          </h1>
          <SpeechBubble text={SPEECH} typewriter onDone={() => setReady(true)} />
          <div className="flex items-center gap-1.5 text-sm font-medium text-text-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-brand" />
            Benjamin · Your AI Strategy Guide
          </div>
          <PrimaryButton onClick={handleBegin} disabled={!ready} className="self-start">
            Begin the Activity →
          </PrimaryButton>
        </div>

        <div className="flex-none flex flex-col items-center gap-4">
          <BenjaminAvatar
            height="clamp(380px, 55vh, 580px)"
            style={{ filter: 'drop-shadow(0 24px 48px rgba(15,82,212,0.18))' }}
          />
          <ThinkingDots />
        </div>
      </div>
    </div>
  )
}
