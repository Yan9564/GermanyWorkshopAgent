import type { ImpactCanvasData } from '@/lib/types'

interface Props {
  data: ImpactCanvasData
  annotationMode: boolean
  annotations: Record<string, string>
  onAnnotate: (key: string) => void
}

function CanvasSection({ title, annotationKey, annotationMode, hasAnnotation, onAnnotate, children }: {
  title: string
  annotationKey: string
  annotationMode: boolean
  hasAnnotation: boolean
  onAnnotate: () => void
  children: React.ReactNode
}) {
  return (
    <div
      data-annotation-key={annotationKey}
      onClick={annotationMode ? onAnnotate : undefined}
      className={`bg-surface border border-border-brand rounded-xl p-4 flex flex-col gap-2 relative
        ${annotationMode ? 'cursor-pointer hover:border-violet-brand' : ''}`}
    >
      <p className="text-xs font-bold text-text-muted uppercase tracking-wide">{title}</p>
      {children}
      {hasAnnotation && (
        <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-yellow-400 text-white text-[0.6rem] font-bold flex items-center justify-center">
          ✎
        </span>
      )}
    </div>
  )
}

const availabilityColour: Record<string, string> = {
  available: 'bg-green-100 text-green-700',
  needs_work: 'bg-yellow-100 text-yellow-700',
  missing: 'bg-red-100 text-red-600',
}

const severityColour: Record<string, string> = {
  Low: 'bg-green-100 text-green-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  High: 'bg-red-100 text-red-600',
}

export default function ImpactCanvasView({ data, annotationMode, annotations, onAnnotate }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <CanvasSection title="Problem Statement" annotationKey="problem" annotationMode={annotationMode} hasAnnotation={!!annotations['problem']} onAnnotate={() => onAnnotate('problem')}>
        <p className="text-sm text-text-default">{data.problem_statement}</p>
      </CanvasSection>

      <CanvasSection title="AI Solution" annotationKey="solution" annotationMode={annotationMode} hasAnnotation={!!annotations['solution']} onAnnotate={() => onAnnotate('solution')}>
        <p className="text-sm text-text-default">{data.solution_overview}</p>
      </CanvasSection>

      <CanvasSection title="Data Required" annotationKey="data" annotationMode={annotationMode} hasAnnotation={!!annotations['data']} onAnnotate={() => onAnnotate('data')}>
        <div className="flex flex-col gap-1.5">
          {data.data_required.map((d, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className={`px-2 py-0.5 rounded-full font-semibold ${availabilityColour[d.availability]}`}>
                {d.availability.replace('_', ' ')}
              </span>
              <span className="text-text-default">{d.source}</span>
              <span className="text-text-muted">({d.type})</span>
            </div>
          ))}
        </div>
      </CanvasSection>

      <CanvasSection title="Key Metrics" annotationKey="metrics" annotationMode={annotationMode} hasAnnotation={!!annotations['metrics']} onAnnotate={() => onAnnotate('metrics')}>
        <div className="flex flex-col gap-1.5">
          {data.key_metrics.map((m, i) => (
            <div key={i} className="text-xs">
              <span className="font-semibold text-text-default">{m.name}</span>
              <span className="text-text-muted"> — {m.baseline} → </span>
              <span className="text-violet-brand font-semibold">{m.target}</span>
              <span className="text-text-muted"> ({m.timeframe})</span>
            </div>
          ))}
        </div>
      </CanvasSection>

      <CanvasSection title="Estimated ROI" annotationKey="roi" annotationMode={annotationMode} hasAnnotation={!!annotations['roi']} onAnnotate={() => onAnnotate('roi')}>
        <div className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between">
            <span className="text-text-muted">Investment</span>
            <span className="font-semibold text-text-default">{data.estimated_roi.investment_range}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Annual benefit</span>
            <span className="font-semibold text-green-600">{data.estimated_roi.annual_benefit}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Payback period</span>
            <span className="font-semibold text-text-default">{data.estimated_roi.payback_period}</span>
          </div>
        </div>
      </CanvasSection>

      <CanvasSection title="Top Risks" annotationKey="risks" annotationMode={annotationMode} hasAnnotation={!!annotations['risks']} onAnnotate={() => onAnnotate('risks')}>
        <div className="flex flex-col gap-2">
          {data.top_risks.map((r, i) => (
            <div key={i} className="text-xs flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full font-semibold ${severityColour[r.severity]}`}>{r.severity}</span>
                <span className="text-text-default">{r.description}</span>
              </div>
              <span className="text-text-muted pl-1">↳ {r.mitigation}</span>
            </div>
          ))}
        </div>
      </CanvasSection>
    </div>
  )
}
