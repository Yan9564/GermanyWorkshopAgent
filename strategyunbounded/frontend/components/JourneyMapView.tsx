import type { JourneyMapData } from '@/lib/types'

interface Props {
  data: JourneyMapData
  annotationMode: boolean
  annotations: Record<string, string>
  onAnnotate: (key: string) => void
}

function StepCard({
  step,
  index,
  side,
  annotationMode,
  annotationNote,
  onAnnotate,
}: {
  step: { label: string; description: string; time_estimate: string | null; is_ai_powered: boolean }
  index: number
  side: 'current' | 'future'
  annotationMode: boolean
  annotationNote: string | undefined
  onAnnotate: () => void
}) {
  const key = `${side}_step_${index}`
  return (
    <div
      data-annotation-key={key}
      onClick={annotationMode ? onAnnotate : undefined}
      className={`relative bg-white border-2 rounded-xl p-3 text-sm transition
        ${step.is_ai_powered ? 'border-violet-brand shadow-[0_0_0_2px_rgba(109,40,217,0.12)]' : 'border-border-brand'}
        ${annotationMode ? 'cursor-pointer hover:border-indigo-brand' : ''}
      `}
    >
      <p className="font-semibold text-text-default">{step.label}</p>
      <p className="text-text-muted text-xs mt-0.5">{step.description}</p>
      {step.time_estimate && (
        <span className="text-[0.65rem] text-text-muted border border-border-brand rounded px-1.5 py-0.5 mt-1 inline-block">
          {step.time_estimate}
        </span>
      )}
      {step.is_ai_powered && (
        <span className="absolute -top-2 -right-2 text-[0.6rem] font-bold bg-violet-brand text-white rounded-full px-1.5 py-0.5">
          AI
        </span>
      )}
      {annotationNote && (
        <span className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-yellow-400 text-white text-[0.6rem] font-bold flex items-center justify-center">
          ✎
        </span>
      )}
    </div>
  )
}

export default function JourneyMapView({ data, annotationMode, annotations, onAnnotate }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-text-muted">
        Persona: <span className="font-semibold text-text-default">{data.persona}</span>
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Today column */}
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-bold text-text-muted uppercase tracking-wide">Today</h3>
          {data.current_steps.map((step, i) => (
            <StepCard
              key={i}
              step={step}
              index={i}
              side="current"
              annotationMode={annotationMode}
              annotationNote={annotations[`current_step_${i}`]}
              onAnnotate={() => onAnnotate(`current_step_${i}`)}
            />
          ))}
          <div className="flex flex-col gap-1 mt-2">
            {data.pain_points.map((p, i) => (
              <span key={i} className="text-xs text-red-600 flex items-start gap-1">
                <span className="mt-0.5">✕</span> {p}
              </span>
            ))}
          </div>
        </div>

        {/* With AI column */}
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-bold text-violet-brand uppercase tracking-wide">With AI</h3>
          {data.future_steps.map((step, i) => (
            <StepCard
              key={i}
              step={step}
              index={i}
              side="future"
              annotationMode={annotationMode}
              annotationNote={annotations[`future_step_${i}`]}
              onAnnotate={() => onAnnotate(`future_step_${i}`)}
            />
          ))}
          <div className="flex flex-col gap-1 mt-2">
            {data.gains.map((g, i) => (
              <span key={i} className="text-xs text-green-600 flex items-start gap-1">
                <span className="mt-0.5">✓</span> {g}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
