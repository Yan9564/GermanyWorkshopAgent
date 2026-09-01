'use client'
import { useRef, useState } from 'react'
import { api } from '@/lib/api'

interface Props {
  onTranscript: (text: string) => void
  disabled?: boolean
  label?: string
}

export default function VoiceRecordButton({ onTranscript, disabled, label }: Props) {
  const [recording, setRecording] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const MAX_SECONDS = 300

  async function startRecording() {
    setError('')
    setElapsed(0)
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError('Microphone access denied.')
      return
    }

    const recorder = new MediaRecorder(stream)
    chunksRef.current = []
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop())
      if (timerRef.current) clearInterval(timerRef.current)
      setUploading(true)
      try {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const result = await api.speechToText(blob)
        onTranscript(result.transcript)
      } catch {
        setError('Transcription failed. Please try again.')
      } finally {
        setUploading(false)
      }
    }
    recorder.start()
    mediaRecorderRef.current = recorder
    setRecording(true)

    timerRef.current = setInterval(() => {
      setElapsed((prev) => {
        if (prev + 1 >= MAX_SECONDS) {
          mediaRecorderRef.current?.stop()
          setRecording(false)
          return MAX_SECONDS
        }
        return prev + 1
      })
    }, 1000)
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current)
    mediaRecorderRef.current?.stop()
    setRecording(false)
  }

  const isDisabled = disabled || uploading

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={recording ? stopRecording : startRecording}
        disabled={isDisabled}
        className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all
          ${recording
            ? 'bg-red-500 border-red-600 animate-pulse'
            : 'bg-white border-violet-brand hover:bg-violet-50'
          }
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}`}
        title={recording ? 'Stop recording' : (label ?? 'Record voice')}
      >
        {uploading ? (
          <span className="w-5 h-5 border-2 border-violet-brand border-t-transparent rounded-full animate-spin" />
        ) : recording ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6D28D9" strokeWidth="2">
            <rect x="9" y="2" width="6" height="12" rx="3" />
            <path d="M5 10a7 7 0 0 0 14 0" />
            <line x1="12" y1="19" x2="12" y2="22" />
            <line x1="8" y1="22" x2="16" y2="22" />
          </svg>
        )}
      </button>

      {recording && (
        <span className="text-xs font-mono text-red-500">
          {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}
        </span>
      )}
      {uploading && <span className="text-xs text-text-muted">Transcribing…</span>}
      {error && <span className="text-xs text-red-500">{error}</span>}
      {!recording && !uploading && label && (
        <span className="text-xs text-text-muted">{label}</span>
      )}
    </div>
  )
}
