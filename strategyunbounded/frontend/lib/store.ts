import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { UseCase, Stage2Result } from './types'

interface WorkshopState {
  step: 1 | 2 | 3 | 4
  sessionId: string | null
  problems: string[]
  problemIds: string[]
  useCases: UseCase[]
  completedProblemIndexes: number[]
  role: 'user' | 'admin'
  voiceMuted: boolean
  selectedUseCaseId: string | null
  stage2: Stage2Result | null

  setStep: (n: 1 | 2 | 3 | 4) => void
  setProblems: (p: string[]) => void
  setSession: (sessionId: string, problemIds: string[]) => void
  addUseCasesForProblem: (problemIndex: number, ucs: UseCase[]) => void
  applyPriorities: (priorities: Record<string, string>) => void
  optimisticVote: (ucId: string, priority: 1 | 2 | 3 | null) => void
  setFeedbackLocal: (ucId: string, fb: 'up' | 'down' | null) => void
  loadSession: (problems: string[], useCases: UseCase[]) => void
  setRole: (r: 'user' | 'admin') => void
  setVoiceMuted: (v: boolean) => void
  setSelectedUseCase: (id: string) => void
  setStage2: (result: Stage2Result) => void
  reset: () => void
}

const initial = {
  step: 1 as const,
  sessionId: null,
  problems: [],
  problemIds: [],
  useCases: [],
  completedProblemIndexes: [],
  role: 'user' as const,
  voiceMuted: false,
  selectedUseCaseId: null,
  stage2: null,
}

export const useStore = create<WorkshopState>()(
  persist(
    (set) => ({
      ...initial,

      setStep: (step) => set({ step }),
      setProblems: (problems) => set({ problems }),
      setSession: (sessionId, problemIds) => set({ sessionId, problemIds, useCases: [], completedProblemIndexes: [] }),

      addUseCasesForProblem: (problemIndex, ucs) =>
        set((s) => {
          const next = [...s.useCases.filter((u) => u.problemIndex !== problemIndex), ...ucs]
          console.log('[STORE] addUseCasesForProblem — problemIndex:', problemIndex, 'added:', ucs.length, 'total now:', next.length)
          return {
            useCases: next,
            completedProblemIndexes: [...s.completedProblemIndexes, problemIndex],
          }
        }),

      applyPriorities: (priorities) =>
        set((s) => {
          console.log('[STORE] applyPriorities — priorities:', priorities, 'total useCases:', s.useCases.length)
          return {
            useCases: s.useCases.map((u) => {
              const slot = Object.entries(priorities).find(([, id]) => id === u.id)
              return slot
                ? { ...u, userPriority: parseInt(slot[0]) as 1 | 2 | 3, aiPriority: parseInt(slot[0]) as 1 | 2 | 3 }
                : u
            }),
          }
        }),

      optimisticVote: (ucId, priority) =>
        set((s) => ({
          useCases: s.useCases.map((u) => {
            if (u.id === ucId) return { ...u, userPriority: priority }
            if (priority !== null && u.userPriority === priority) return { ...u, userPriority: null }
            return u
          }),
        })),

      setFeedbackLocal: (ucId, fb) =>
        set((s) => ({
          useCases: s.useCases.map((u) => (u.id === ucId ? { ...u, feedback: fb } : u)),
        })),

      loadSession: (problems, useCases) => set({ problems, useCases }),

      setRole: (role) => set({ role }),

      setVoiceMuted: (voiceMuted) => set({ voiceMuted }),

      setSelectedUseCase: (selectedUseCaseId) => set({ selectedUseCaseId }),

      setStage2: (stage2) => set({ stage2 }),

      reset: () => set(initial),
    }),
    {
      name: 'workshop-session',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        sessionId: s.sessionId,
        problems: s.problems,
        problemIds: s.problemIds,
        useCases: s.useCases,
        step: s.step,
        voiceMuted: s.voiceMuted,
      }),
    }
  )
)
