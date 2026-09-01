'use client'
import { useStore } from '@/lib/store'

export default function MuteToggle() {
  const { voiceMuted, setVoiceMuted } = useStore()

  return (
    <button
      onClick={() => setVoiceMuted(!voiceMuted)}
      title={voiceMuted ? 'Unmute Benjamin' : 'Mute Benjamin'}
      className="w-8 h-8 rounded-full border border-border-brand flex items-center justify-center text-text-muted hover:border-violet-brand hover:text-violet-brand transition"
    >
      {voiceMuted ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 5L6 9H2v6h4l5 4V5z" />
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 5L6 9H2v6h4l5 4V5z" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
      )}
    </button>
  )
}
