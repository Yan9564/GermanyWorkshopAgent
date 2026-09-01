interface Props { priority: 1 | 2 | 3; size?: 'sm' | 'md' }

const cfg = {
  1: { bg: 'bg-p1-bg', text: 'text-rose-brand', label: 'Priority 1' },
  2: { bg: 'bg-p2-bg', text: 'text-indigo-brand', label: 'Priority 2' },
  3: { bg: 'bg-p3-bg', text: 'text-text-muted', label: 'Priority 3' },
}

export default function PriorityBadge({ priority, size = 'sm' }: Props) {
  const { bg, text, label } = cfg[priority]
  return (
    <span className={`${bg} ${text} font-mono font-medium rounded ${size === 'sm' ? 'text-[0.62rem] px-2 py-0.5 tracking-widest uppercase' : 'text-[0.7rem] px-2.5 py-1 tracking-widest uppercase'}`}>
      {label}
    </span>
  )
}
