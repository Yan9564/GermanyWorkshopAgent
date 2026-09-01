'use client'
import { useEffect, useRef, useState } from 'react'

interface Props {
  text: string
  typewriter?: boolean
  arrowSide?: 'right' | 'bottom'
  onDone?: () => void
  className?: string
  textClassName?: string
}

export default function SpeechBubble({ text, typewriter = false, arrowSide = 'right', onDone, className = '', textClassName = '' }: Props) {
  const [displayed, setDisplayed] = useState(typewriter ? '' : text)
  const [done, setDone] = useState(!typewriter)
  const indexRef = useRef(0)

  useEffect(() => {
    if (!typewriter) { setDisplayed(text); return }
    setDisplayed('')
    setDone(false)
    indexRef.current = 0
    const words = text.split(' ')
    const interval = setInterval(() => {
      indexRef.current++
      setDisplayed(words.slice(0, indexRef.current).join(' '))
      if (indexRef.current >= words.length) {
        clearInterval(interval)
        setDone(true)
        onDone?.()
      }
    }, 60)
    return () => clearInterval(interval)
  }, [text, typewriter])

  const arrowRight = arrowSide === 'right'

  return (
    <div
      className={`bg-white border-2 border-border-brand rounded-[20px] shadow-[0_4px_24px_rgba(109,40,217,0.1)] p-5 relative ${className}`}
    >
      {arrowRight && (
        <>
          <span className="absolute -right-[14px] top-8 border-[7px] border-transparent border-l-[14px] border-l-border-brand" />
          <span className="absolute -right-[11px] top-[33px] border-[6px] border-transparent border-l-[12px] border-l-white z-10" />
        </>
      )}
      {!arrowRight && (
        <>
          <span className="absolute -bottom-[14px] left-1/2 -translate-x-1/2 border-[7px] border-transparent border-t-[14px] border-t-border-brand" />
          <span className="absolute -bottom-[11px] left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-[12px] border-t-white z-10" />
        </>
      )}
      <p className={`leading-relaxed text-base min-h-[3em] ${textClassName || 'text-text-default'}`}>
        {displayed}
        {!done && <span className="inline-block w-0.5 h-[1.1em] bg-violet-brand ml-0.5 align-text-bottom animate-blink" />}
      </p>
    </div>
  )
}
