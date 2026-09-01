'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ProblemField from '@/components/ProblemField'
import BenjaminAvatar from '@/components/BenjaminAvatar'
import PrimaryButton from '@/components/PrimaryButton'
import GuideTooltip from '@/components/GuideTooltip'
import { useStore } from '@/lib/store'
import { api } from '@/lib/api'

export default function ActivityPage() {
  const router = useRouter()
  const { setStep, setProblems, setSession, role } = useStore()
  const [values, setValues] = useState(['', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [promptContent, setPromptContent] = useState('')
  const [promptLoading, setPromptLoading] = useState(false)
  const [promptSaved, setPromptSaved] = useState(false)

  useEffect(() => {
    setStep(2)
    if (role === 'admin') {
      api.getSystemPrompt().then((r) => setPromptContent(r.content)).catch(() => {})
    }
  }, [role])

  const allValid = values.every((v) => v.trim().length >= 10)

  function update(i: number, val: string) {
    setValues((prev) => { const next = [...prev]; next[i] = val; return next })
  }

  const filledCount = values.filter((v) => v.trim().length >= 10).length
  const guideStage =
    filledCount === 0 ? 'problem_input_empty' as const :
    filledCount < 5 ? 'problem_input_partial' as const : 'problem_input_ready' as const

  async function handleSubmit() {
    setError('')
    setLoading(true)
    try {
      const problems = values.map((v) => v.trim())
      setProblems(problems)
      const res = await api.createSession(problems)
      setSession(res.sessionId, res.problemIds)
      if (res.cached) {
        const session = await api.getSession(res.sessionId)
        const allUcs = session.problems.flatMap((p) => p.useCases)
        useStore.getState().loadSession(problems, allUcs)
        setStep(4)
        router.push('/activity/results')
      } else {
        setStep(3)
        router.push('/activity/processing')
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setLoading(false)
    }
  }

  async function savePrompt() {
    setPromptLoading(true)
    try {
      await api.updateSystemPrompt(promptContent)
      setPromptSaved(true)
      setTimeout(() => setPromptSaved(false), 2000)
    } catch {
      // silently fail
    } finally {
      setPromptLoading(false)
    }
  }

  async function resetPrompt() {
    if (!confirm('Reset system prompt to factory default?')) return
    setPromptLoading(true)
    try {
      const r = await api.resetSystemPrompt()
      setPromptContent(r.content)
    } catch {
      // silently fail
    } finally {
      setPromptLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-70px)] px-4 md:px-10 py-10">
      <div className="flex gap-8 max-w-[1100px] mx-auto w-full items-start">
        <div className="flex-1">
          <h2 className="text-[clamp(1.5rem,3.5vw,2.4rem)] font-extrabold text-text-default mb-1">
            What challenges is your organisation facing?
          </h2>
          <p className="text-text-muted mb-8 text-sm md:text-base">
            Share 5 real problems. Benjamin will guide our AI agents to create tailored solutions.
          </p>

          {values.map((v, i) => (
            <ProblemField key={i} index={i} value={v} onChange={(val) => update(i, val)} />
          ))}

          {error && <p className="text-red-brand text-sm mb-3">{error}</p>}

          <PrimaryButton onClick={handleSubmit} disabled={!allValid || loading} className="mt-2">
            {loading ? 'Creating session…' : 'Generate Use Cases →'}
          </PrimaryButton>

          {role === 'admin' && (
            <div className="mt-10 p-5 bg-surface border-2 border-border-brand rounded-xl2">
              <div className="font-bold text-indigo-brand mb-3 text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-violet-brand" />
                System Prompt (Admin)
              </div>
              <textarea
                value={promptContent}
                onChange={(e) => setPromptContent(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 border-2 border-border-brand rounded-xl text-sm text-text-default bg-page resize-y outline-none focus:border-indigo-brand transition"
              />
              <div className="flex gap-3 mt-3 flex-wrap">
                <button
                  onClick={savePrompt}
                  disabled={promptLoading}
                  className="px-5 py-2 bg-gradient-action text-white text-sm font-bold rounded-full hover:shadow-glow transition disabled:opacity-50"
                >
                  {promptSaved ? 'Saved ✓' : 'Save'}
                </button>
                <button
                  onClick={resetPrompt}
                  disabled={promptLoading}
                  className="px-5 py-2 border-2 border-border-brand text-text-muted text-sm font-semibold rounded-full hover:border-violet-brand hover:text-violet-brand transition"
                >
                  Reset to Default
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="hidden md:flex flex-col items-center sticky top-24 bg-surface border-2 border-border-brand rounded-xl2 p-5 flex-none">
          <BenjaminAvatar height="clamp(140px,20vh,200px)" />
        </div>
      </div>

      <GuideTooltip stage={guideStage} context={{ problemsFilledCount: filledCount }} />
    </div>
  )
}
