'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useStore } from '@/lib/store'
import MuteToggle from '@/components/MuteToggle'

const STEP_NAMES: Record<number, string> = {
  1: 'Introduction',
  2: 'Define Challenges',
  3: 'AI Analysis',
  4: 'Review & Prioritise',
}

export default function Header() {
  const step = useStore((s) => s.step)
  const pathname = usePathname()
  const isLanding = pathname === '/'

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-10 py-4 bg-surface border-b border-border-brand">
      <div className="text-lg md:text-xl font-bold text-text-default tracking-tight">
        Strategy<span className="text-indigo-brand"> Unbounded</span>
      </div>

      <div className="flex items-center gap-3">
        {!isLanding && (
          <>
            <div className="hidden md:flex flex-col items-end gap-0.5">
              <span className="text-[0.58rem] font-mono font-semibold tracking-[0.16em] uppercase text-indigo-brand">
                Stage 1 · Search
              </span>
              <span className="text-[0.65rem] font-semibold text-text-muted">
                Step {step} of 4 — {STEP_NAMES[step] ?? ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className={`h-2 rounded-full border-2 transition-all duration-300 ${
                    n < step
                      ? 'bg-bright border-bright w-8 md:w-10'
                      : n === step
                      ? 'bg-violet-brand border-violet-brand w-8 md:w-10'
                      : 'bg-tint border-border-brand w-7 md:w-9'
                  }`}
                />
              ))}
            </div>
          </>
        )}
        <MuteToggle />
        <Link
          href="/admin"
          className="text-xs font-semibold text-text-muted hover:text-violet-brand transition ml-2 hidden md:block"
        >
          Admin
        </Link>
      </div>
    </header>
  )
}
