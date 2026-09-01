'use client'
import { useRouter } from 'next/navigation'
import PrimaryButton from '@/components/PrimaryButton'

const STAGES = [
  {
    num: '01',
    name: 'Search',
    tagline: 'Scanning Boundless Options',
    bound:
      'A planning cycle surfaces a handful of ideas; most of the possibility space stays unexplored.',
    aiChange:
      'Cost of generating and screening options falls sharply. Scan the relevant universe through several strategic lenses — long list by machine, short list by judgment.',
    example:
      'M&A scouting: 500+ targets scored in under a day, narrowed to 15 leads.',
    active: true,
  },
  {
    num: '02',
    name: 'Representation',
    tagline: 'Dynamic Modelling of Volatile Environments',
    bound:
      'Frameworks and quarterly reports are static and simplified — unable to replicate real-world scenarios.',
    aiChange:
      'Higher-resolution, continuously updated models with many more variables and real-time signals, revealing segments and risks the old model cannot.',
    example:
      'MYbank: 3,000+ variables opened credit to 53 million small businesses.',
    active: false,
  },
  {
    num: '03',
    name: 'Aggregation',
    tagline: "Combining People's Judgments",
    bound:
      'Hierarchy, politics and the clock distort meetings. Senior views dominate, dissent is risky, groups converge too fast.',
    aiChange:
      'Synthetic deliberation without social friction, with creator, critic and competitor agent roles — and synthetic panels of customers or regulators.',
    example:
      'P&G field experiment: individuals with AI matched the performance of two-person teams.',
    active: false,
  },
]

function StageCard({
  num,
  name,
  tagline,
  bound,
  aiChange,
  example,
  active,
}: (typeof STAGES)[number]) {
  return (
    <div
      className={`bg-surface rounded-xl2 overflow-hidden flex flex-col border-2 transition-all duration-200 ${
        active
          ? 'border-indigo-brand shadow-card-hover'
          : 'border-border-brand shadow-card opacity-50'
      }`}
    >
      <div className={`h-1.5 ${active ? 'bg-gradient-action' : 'bg-tint'}`} />

      <div className="p-6 flex flex-col gap-4 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span
              className={`font-mono text-[0.62rem] tracking-[0.18em] uppercase font-semibold ${
                active ? 'text-indigo-brand' : 'text-text-muted'
              }`}
            >
              {num}
            </span>
            <h3
              className={`font-extrabold text-[1.6rem] leading-tight mt-0.5 ${
                active ? 'text-text-default' : 'text-text-muted'
              }`}
            >
              {name}
            </h3>
          </div>
          {active && (
            <span className="text-[0.58rem] font-mono font-semibold tracking-widest uppercase text-indigo-brand border border-indigo-brand rounded-full px-2 py-0.5 flex-shrink-0 mt-1">
              ● Active
            </span>
          )}
        </div>

        <p
          className={`text-[0.62rem] font-mono font-semibold tracking-[0.14em] uppercase ${
            active ? 'text-text-muted' : 'text-border-brand'
          }`}
        >
          {tagline}
        </p>

        <div>
          <p
            className={`text-[0.62rem] font-mono font-semibold tracking-widest uppercase mb-1.5 ${
              active ? 'text-text-muted' : 'text-border-brand'
            }`}
          >
            Cognitive Bound
          </p>
          <p
            className={`text-sm leading-relaxed ${
              active ? 'text-text-default' : 'text-text-muted'
            }`}
          >
            {bound}
          </p>
        </div>

        <div>
          <p
            className={`text-[0.62rem] font-mono font-semibold tracking-widest uppercase mb-1.5 ${
              active ? 'text-indigo-brand' : 'text-border-brand'
            }`}
          >
            What AI Changes
          </p>
          <p
            className={`text-sm leading-relaxed ${
              active ? 'text-text-default' : 'text-text-muted'
            }`}
          >
            {aiChange}
          </p>
        </div>

        <div
          className={`mt-auto pt-4 border-t ${
            active ? 'border-border-brand' : 'border-tint'
          }`}
        >
          <p
            className={`text-[0.62rem] font-mono font-semibold tracking-widest uppercase mb-1.5 ${
              active ? 'text-text-muted' : 'text-border-brand'
            }`}
          >
            Example
          </p>
          <p
            className={`text-xs font-mono leading-relaxed ${
              active ? 'text-text-default' : 'text-text-muted'
            }`}
          >
            {example}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const router = useRouter()

  return (
    <div className="min-h-[calc(100vh-70px)] flex flex-col">
      <div className="max-w-[1100px] mx-auto px-6 md:px-10 pt-14 pb-10 w-full">
        <p className="text-[0.65rem] font-mono font-semibold tracking-[0.18em] uppercase text-indigo-brand mb-4">
          AI-Powered Strategy Workshop
        </p>
        <h1 className="font-serif italic text-[clamp(2.2rem,4.5vw,3.8rem)] text-text-default leading-[1.06] tracking-tight mb-5">
          Strategising with<br />Unbounded Intelligence
        </h1>
        <p className="text-text-muted text-base max-w-2xl leading-relaxed">
          AI relaxes cognitive boundaries across the tasks involved in strategic
          decision-making. The bottleneck was never a shortage of possible
          directions — only the limited capacity of the human minds doing the
          work. This workshop moves through three stages.
        </p>
      </div>

      <div className="max-w-[1100px] mx-auto px-6 md:px-10 pb-10 w-full flex-1">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {STAGES.map((s) => (
            <StageCard key={s.num} {...s} />
          ))}
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-6 md:px-10 pb-14 w-full">
        <PrimaryButton onClick={() => router.push('/workshop')}>
          Begin Stage 1: Search →
        </PrimaryButton>
        <p className="text-text-muted text-xs mt-3 font-mono">
          Stages 2 and 3 follow after Stage 1 is complete.
        </p>
      </div>
    </div>
  )
}
