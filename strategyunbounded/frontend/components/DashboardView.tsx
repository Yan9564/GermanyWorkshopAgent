import type { DashboardData, ChartSpec } from '@/lib/types'

interface Props {
  data: DashboardData
  annotationMode: boolean
  annotations: Record<string, string>
  onAnnotate: (key: string) => void
}

function ChartBlock({ spec, annotationMode, annotationNote, onAnnotate }: {
  spec: ChartSpec
  annotationMode: boolean
  annotationNote: string | undefined
  onAnnotate: () => void
}) {
  const keys = spec.sample_data.length > 0 ? Object.keys(spec.sample_data[0]) : []
  const labelKey = keys[0] ?? 'label'
  const valueKey = keys[1] ?? 'value'

  // Simple SVG bar chart (no external dependency required)
  function BarChart() {
    const values = spec.sample_data.map((d) => Number(d[valueKey]) || 0)
    const max = Math.max(...values, 1)
    const barW = Math.floor(220 / Math.max(values.length, 1)) - 6
    return (
      <svg width="100%" viewBox={`0 0 ${Math.max(220, values.length * (barW + 6) + 20)} 80`} className="overflow-visible">
        {values.map((v, i) => (
          <g key={i}>
            <rect
              x={i * (barW + 6) + 10}
              y={80 - (v / max) * 60}
              width={barW}
              height={(v / max) * 60}
              rx="3"
              fill="#6D28D9"
              opacity="0.8"
            />
            <text
              x={i * (barW + 6) + 10 + barW / 2}
              y="78"
              textAnchor="middle"
              fontSize="8"
              fill="#6B7280"
            >
              {String(spec.sample_data[i][labelKey] ?? '').slice(0, 8)}
            </text>
          </g>
        ))}
      </svg>
    )
  }

  function TableChart() {
    return (
      <div className="overflow-x-auto">
        <table className="text-xs w-full">
          <thead>
            <tr>
              {keys.map((k) => (
                <th key={k} className="text-left font-semibold text-text-muted pb-1 pr-3">{k}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {spec.sample_data.slice(0, 5).map((row, i) => (
              <tr key={i} className="border-t border-border-brand">
                {keys.map((k) => (
                  <td key={k} className="py-1 pr-3 text-text-default">{String(row[k] ?? '')}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div
      onClick={annotationMode ? onAnnotate : undefined}
      className={`bg-white border border-border-brand rounded-xl p-4 flex flex-col gap-3 relative
        ${annotationMode ? 'cursor-pointer hover:border-violet-brand' : ''}`}
    >
      <div>
        <p className="text-sm font-semibold text-text-default">{spec.title}</p>
        <p className="text-xs text-text-muted">{spec.description}</p>
      </div>
      {spec.chart_type === 'table' ? <TableChart /> : <BarChart />}
      <p className="text-[0.6rem] text-text-muted italic">Illustrative data</p>
      {annotationNote && (
        <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-yellow-400 text-white text-[0.6rem] font-bold flex items-center justify-center">
          ✎
        </span>
      )}
    </div>
  )
}

export default function DashboardView({ data, annotationMode, annotations, onAnnotate }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-lg font-bold text-text-default">{data.title}</h3>
        <p className="text-sm text-text-muted">{data.subtitle}</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {data.kpi_cards.map((kpi, i) => (
          <div
            key={i}
            data-annotation-key={`kpi_${i}`}
            onClick={annotationMode ? () => onAnnotate(`kpi_${i}`) : undefined}
            className={`bg-surface border-2 border-border-brand rounded-xl p-4 flex flex-col gap-1 relative
              ${annotationMode ? 'cursor-pointer hover:border-violet-brand' : ''}`}
          >
            <p className="text-xs text-text-muted font-medium">{kpi.label}</p>
            <p className="text-2xl font-extrabold text-text-default">{kpi.value}</p>
            {kpi.unit && <p className="text-xs text-text-muted">{kpi.unit}</p>}
            {kpi.trend && <p className="text-xs text-green-600 font-semibold">{kpi.trend}</p>}
            {annotations[`kpi_${i}`] && (
              <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-yellow-400 text-white text-[0.6rem] font-bold flex items-center justify-center">
                ✎
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.charts.map((chart, i) => (
          <ChartBlock
            key={i}
            spec={chart}
            annotationMode={annotationMode}
            annotationNote={annotations[`chart_${i}`]}
            onAnnotate={() => onAnnotate(`chart_${i}`)}
          />
        ))}
      </div>
    </div>
  )
}
