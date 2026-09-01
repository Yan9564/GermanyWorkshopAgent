'use client'
import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { useStore } from '@/lib/store'
import type { AvatarStage } from '@/lib/types'

interface Props {
  stage: AvatarStage
  context?: Record<string, unknown>
}

export default function GuideTooltip({ stage, context }: Props) {
  const [visible, setVisible] = useState(false)
  const [text, setText] = useState('')
  const [nextStep, setNextStep] = useState('')
  const [clicked, setClicked] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const loaded = useRef(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const { voiceMuted } = useStore()

  useEffect(() => {
    loaded.current = false
    setText('')
    setNextStep('')
    stopAudio()
  }, [stage])

  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
    setSpeaking(false)
  }

  async function fetchGuidance(): Promise<{ message: string; nextStep: string }> {
    if (loaded.current && text) return { message: text, nextStep }
    loaded.current = true
    try {
      const res = await api.getAvatarGuidance(stage, context)
      setText(res.message)
      setNextStep(res.nextStep)
      return res
    } catch {
      const fallback = { message: "Keep going — you're doing great.", nextStep: 'Continue with the workshop.' }
      setText(fallback.message)
      setNextStep(fallback.nextStep)
      return fallback
    }
  }

  async function playTTS(messageText: string) {
    if (voiceMuted || speaking) return
    stopAudio()
    setSpeaking(true)
    try {
      const blob = await api.textToSpeech(messageText)
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => { setSpeaking(false); URL.revokeObjectURL(url) }
      audio.onerror = () => { setSpeaking(false); URL.revokeObjectURL(url) }
      await audio.play()
    } catch {
      setSpeaking(false)
    }
  }

  async function toggle() {
    setVisible((v) => !v)
    setClicked(true)
    const guidance = await fetchGuidance()
    if (!voiceMuted) playTTS(guidance.message)
  }

  async function handleSpeakerClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (speaking) { stopAudio(); return }
    const guidance = await fetchGuidance()
    playTTS(guidance.message)
  }

  // Auto-play on stage entry (800 ms delay so navigation settles)
  useEffect(() => {
    if (voiceMuted) return
    let cancelled = false
    const timer = setTimeout(async () => {
      if (cancelled) return
      const guidance = await fetchGuidance()
      if (!cancelled) playTTS(guidance.message)
    }, 800)
    return () => { cancelled = true; clearTimeout(timer) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, voiceMuted])

  return (
    <>
      {visible && (
        <div className="fixed bottom-20 right-8 z-50 bg-white border-2 border-border-brand border-l-4 border-l-violet-brand rounded-2xl p-4 max-w-[260px] text-sm font-medium text-text-default leading-relaxed shadow-[0_8px_32px_rgba(109,40,217,0.15)] animate-fade-in-up">
          <p>{text || 'Loading…'}</p>
          {nextStep && <p className="mt-2 font-semibold text-violet-brand">{nextStep}</p>}
          {text && (
            <button
              onClick={handleSpeakerClick}
              title={speaking ? 'Stop' : 'Listen'}
              className="mt-2 text-violet-brand hover:text-indigo-brand transition"
            >
              {speaking ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16"/>
                  <rect x="14" y="4" width="4" height="16"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 5L6 9H2v6h4l5 4V5z"/>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                </svg>
              )}
            </button>
          )}
        </div>
      )}
      <button
        onClick={toggle}
        title="Need help?"
        className={`fixed bottom-8 right-8 z-50 w-14 h-14 rounded-full bg-white border-2 border-violet-brand flex items-center justify-center shadow-fab transition-all hover:scale-105 hover:shadow-[0_6px_28px_rgba(109,40,217,0.4)] ${!clicked ? 'animate-fab-pulse' : ''} ${speaking ? 'ring-2 ring-violet-brand ring-offset-2' : ''}`}
      >
        <svg width="26" height="26" viewBox="0 0 40 40" fill="none">
          <rect x="8" y="12" width="24" height="16" rx="4" stroke="#6D28D9" strokeWidth="2.5"/>
          <line x1="20" y1="12" x2="20" y2="7" stroke="#6D28D9" strokeWidth="2.5" strokeLinecap="round"/>
          <circle cx="20" cy="6" r="2" fill="#6D28D9"/>
          <circle cx="14" cy="19" r="2.5" fill="#6D28D9"/>
          <circle cx="26" cy="19" r="2.5" fill="#6D28D9"/>
          <path d="M14 25 Q20 28.5 26 25" stroke="#6D28D9" strokeWidth="2" strokeLinecap="round"/>
          <rect x="13" y="28" width="14" height="7" rx="2" stroke="#6D28D9" strokeWidth="2"/>
          <line x1="9" y1="29" x2="13" y2="31" stroke="#6D28D9" strokeWidth="2" strokeLinecap="round"/>
          <line x1="31" y1="29" x2="27" y2="31" stroke="#6D28D9" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
    </>
  )
}
