import type { PipelineData, PipelineNode } from '@/lib/types'

interface Props {
  data: PipelineData
  annotationMode: boolean
  annotations: Record<string, string>
  onAnnotate: (key: string) => void
}

const nodeColours: Record<PipelineNode['type'], { bg: string; border: string; text: string }> = {
  source:    { bg: 'bg-blue-50',    border: 'border-blue-300',    text: 'text-blue-700' },
  ingest:    { bg: 'bg-cyan-50',    border: 'border-cyan-300',    text: 'text-cyan-700' },
  transform: { bg: 'bg-yellow-50',  border: 'border-yellow-300',  text: 'text-yellow-700' },
  model:     { bg: 'bg-violet-50',  border: 'border-violet-300',  text: 'text-violet-700' },
  output:    { bg: 'bg-green-50',   border: 'border-green-300',   text: 'text-green-700' },
  consumer:  { bg: 'bg-orange-50',  border: 'border-orange-300',  text: 'text-orange-700' },
}

const nodeTypeLabel: Record<PipelineNode['type'], string> = {
  source: 'Data Source',
  ingest: 'Ingestion',
  transform: 'Transform',
  model: 'AI / Model',
  output: 'Output',
  consumer: 'Consumer',
}

export default function PipelineView({ data, annotationMode, annotations, onAnnotate }: Props) {
  // Build a simple adjacency map for display
  const nodeById = Object.fromEntries(data.nodes.map((n) => [n.id, n]))

  // Group nodes left-to-right by type order
  const typeOrder: PipelineNode['type'][] = ['source', 'ingest', 'transform', 'model', 'output', 'consumer']
  const grouped = typeOrder
    .map((t) => data.nodes.filter((n) => n.type === t))
    .filter((g) => g.length > 0)

  return (
    <div className="flex flex-col gap-6">
      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(nodeColours) as PipelineNode['type'][])
          .filter((t) => data.nodes.some((n) => n.type === t))
          .map((t) => {
            const c = nodeColours[t]
            return (
              <span key={t} className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${c.bg} ${c.border} ${c.text}`}>
                {nodeTypeLabel[t]}
              </span>
            )
          })}
      </div>

      {/* Pipeline flow — left to right columns */}
      <div className="overflow-x-auto">
        <div className="flex items-start gap-2 min-w-max">
          {grouped.map((group, gi) => (
            <div key={gi} className="flex flex-col gap-2">
              {group.map((node) => {
                const c = nodeColours[node.type]
                const key = `node_${node.id}`
                return (
                  <div
                    key={node.id}
                    data-annotation-key={key}
                    onClick={annotationMode ? () => onAnnotate(key) : undefined}
                    className={`relative border-2 rounded-xl p-3 w-44 ${c.bg} ${c.border}
                      ${annotationMode ? 'cursor-pointer hover:opacity-80' : ''}`}
                  >
                    <span className={`text-[0.6rem] font-bold uppercase tracking-wide ${c.text}`}>
                      {nodeTypeLabel[node.type]}
                    </span>
                    <p className="text-sm font-semibold text-text-default mt-0.5">{node.label}</p>
                    <p className="text-xs text-text-muted mt-0.5">{node.description}</p>
                    {annotations[key] && (
                      <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-yellow-400 text-white text-[0.6rem] font-bold flex items-center justify-center">
                        ✎
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Edge list as readable text */}
      {data.edges.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Data Flow</p>
          {data.edges.map((edge, i) => {
            const from = nodeById[edge.from_id]
            const to = nodeById[edge.to_id]
            return (
              <div key={i} className="text-xs text-text-muted flex items-center gap-1.5">
                <span className="font-medium text-text-default">{from?.label ?? edge.from_id}</span>
                <span>→</span>
                <span className="font-medium text-text-default">{to?.label ?? edge.to_id}</span>
                {edge.label && <span className="text-text-muted">({edge.label})</span>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
