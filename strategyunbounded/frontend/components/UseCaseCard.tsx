'use client'
import VoteButtons from './VoteButtons'
import type { UseCase } from '@/lib/types'

interface Props {
  uc: UseCase
  sessionId: string
  onClick: () => void
}

const tierBorder: Record<number, string> = {
  1: 'border-l-rose-brand',
  2: 'border-l-indigo-brand',
  3: 'border-l-border-brand',
}
const tierLabel: Record<number, string> = { 1: 'P1', 2: 'P2', 3: 'P3' }
const tierTextColor: Record<number, string> = {
  1: 'text-rose-brand',
  2: 'text-indigo-brand',
  3: 'text-text-muted',
}

export default function UseCaseCard({ uc, sessionId, onClick }: Props) {
  const p = uc.userPriority

  return (
    <div
      onClick={onClick}
      className={`bg-surface rounded-xl2 border border-border-brand border-l-4 ${p ? tierBorder[p] : 'border-l-border-brand'} shadow-card cursor-pointer transition-all duration-200 hover:shadow-card-hover hover:-translate-y-1 flex flex-col overflow-hidden relative`}
    >
      <div className="p-4 md:p-5 flex-1 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          {p ? (
            <span className={`font-mono text-[0.62rem] font-medium tracking-widest uppercase ${tierTextColor[p]}`}>
              {tierLabel[p]}
            </span>
          ) : <span />}
          {p && <VoteButtons ucId={uc.id} sessionId={sessionId} userPriority={p} />}
        </div>
        <div className="font-bold text-text-default leading-snug text-[0.95rem] md:text-base mt-1">
          {uc.title}
        </div>
        <div className="text-text-muted text-[0.82rem] line-clamp-2 leading-relaxed">
          {uc.summary}
        </div>
        {uc.alsoAddresses && uc.alsoAddresses.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {uc.alsoAddresses.map((idx) => (
              <span
                key={idx}
                className="text-[0.7rem] px-2 py-0.5 rounded-full bg-tint text-indigo-brand border border-border-brand"
              >
                Also solves P{idx + 1}
              </span>
            ))}
          </div>
        )}
        <div className="mt-auto pt-3 text-[0.8rem] font-semibold text-indigo-brand">
          View Details →
        </div>
      </div>
    </div>
  )
}
