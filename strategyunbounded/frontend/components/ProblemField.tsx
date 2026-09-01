'use client'

interface Props {
  index: number
  value: string
  onChange: (val: string) => void
}

export default function ProblemField({ index, value, onChange }: Props) {
  return (
    <div className="flex items-start gap-4 md:gap-5 mb-5">
      <div className="w-9 h-9 rounded-full bg-indigo-brand text-white font-mono font-medium text-[0.75rem] flex items-center justify-center flex-shrink-0 mt-1.5">
        {String(index + 1).padStart(2, '0')}
      </div>
      <div className="flex-1 relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Describe problem ${index + 1}…`}
          maxLength={300}
          rows={2}
          className="w-full px-4 py-3.5 border-2 border-border-brand rounded-xl font-sans text-sm text-text-default bg-surface resize-y min-h-[70px] leading-relaxed outline-none transition-all focus:border-indigo-brand focus:shadow-[0_0_0_4px_rgba(15,82,212,0.12)]"
        />
        <span className="absolute bottom-1.5 right-3 text-[0.68rem] text-text-muted font-medium">
          {value.length} / 300
        </span>
      </div>
    </div>
  )
}
