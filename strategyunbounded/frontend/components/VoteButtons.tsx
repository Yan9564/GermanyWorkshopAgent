'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { api } from '@/lib/api'

interface Props {
  ucId: string
  sessionId: string
  userPriority: 1 | 2 | 3 | null
}

export default function VoteButtons({ ucId, sessionId, userPriority }: Props) {
  const optimisticVote = useStore((s) => s.optimisticVote)
  const [loading, setLoading] = useState(false)

  async function vote(delta: -1 | 1) {
    if (!userPriority || loading) return
    const next = (userPriority + delta) as 1 | 2 | 3
    if (next < 1 || next > 3) return
    optimisticVote(ucId, next)
    setLoading(true)
    try {
      const res = await api.patchVote(sessionId, ucId, next)
      if (res.displaced) optimisticVote(res.displaced, null)
    } catch {
      optimisticVote(ucId, userPriority)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); vote(-1) }}
        disabled={!userPriority || userPriority <= 1 || loading}
        className="bg-transparent border-none cursor-pointer text-xs font-bold px-1 py-0.5 text-indigo-brand rounded hover:bg-tint transition disabled:text-text-muted disabled:cursor-not-allowed"
      >▲</button>
      <button
        onClick={(e) => { e.stopPropagation(); vote(1) }}
        disabled={!userPriority || userPriority >= 3 || loading}
        className="bg-transparent border-none cursor-pointer text-xs font-bold px-1 py-0.5 text-indigo-brand rounded hover:bg-tint transition disabled:text-text-muted disabled:cursor-not-allowed"
      >▼</button>
    </>
  )
}
