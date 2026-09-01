# Landing Page Redesign — Strategy Unbounded

## Source material: Slide 15

The slide establishes that AI relaxes cognitive boundaries across three sequential stages of strategic decision-making. Each stage names the bounded-rationality constraint it breaks, and provides a real-world example.

| Stage | Name | Tagline | Cognitive Bound | Example |
|---|---|---|---|---|
| 1 | Search | Scanning boundless options | A planning cycle surfaces a handful of ideas; most of the possibility space stays unexplored | M&A scouting: 500+ targets scored in a day, narrowed to 15 leads |
| 2 | Representation | Dynamic modelling of volatile environments | Frameworks and reports are static and simplified — unable to replicate real-world scenarios | MYbank: 3,000+ variables opened credit to 53m small businesses |
| 3 | Aggregation | Combining people's judgments | Hierarchy and politics distort meetings; senior views dominate, dissent is risky, groups converge too fast | P&G field experiment: individuals with AI matched two-person teams |

The unifying thesis (final paragraph, Slide 17): *"The limits are pushed outward, not removed. Strategic advantage shifts to those who place AI deliberately: the right role, at the right stage of the process."*

---

## What changes

### 1 · New landing page (`app/page.tsx` — full replacement)

The current intro page (Benjamin avatar + typewriter) is replaced by a three-stage informational overview. No avatar on this page — the 3 stages take full visual focus.

**Purpose:** Orient the user to the full workshop arc before they begin. Only Stage 1 is active in this session.

**Content sections:**

**Hero block**
- Kicker: `AI-Powered Strategy Workshop`
- H1 (serif italic): *Strategising with Unbounded Intelligence*
- Sub: *AI relaxes cognitive boundaries across the tasks involved in strategic decision-making. The bottleneck was never a shortage of possible directions — only the limited capacity of the human minds doing the work.*
- No avatar.

**Three-stage panel (horizontal on desktop, stacked on mobile)**

Each panel card contains:
- Stage number in monospace (e.g. `01`)
- Stage name in bold serif (e.g. **Search**)
- Tagline in uppercase tracking (e.g. `SCANNING BOUNDLESS OPTIONS`)
- The cognitive bound — one sentence from the slides, styled as a quote or muted descriptor
- The real example — single sentence, styled as a "dim label + value" pair
- A status indicator:
  - Stage 1 → active, branded colour, no lock
  - Stage 2 & 3 → muted, greyed, a small "Stage 2" or "Stage 3" label only (no "coming soon" copy — just visually inactive)

**CTA**
- Single primary button: `Begin Stage 1: Search →`
- On click: navigates to `/workshop` (the Benjamin intro, now Stage 1 · Step 1 of 4)

---

### 2 · Page routing — new `/workshop` route

The existing Benjamin intro page (`app/page.tsx`) moves to **`app/workshop/page.tsx`**.

- This page becomes **Stage 1 · Step 1 of 4** inside the workshop.
- It retains Benjamin, the typewriter speech bubble, and the "Begin the Activity →" button.
- That button navigates to `/activity` (problem input), which becomes Step 2.

Existing routes are otherwise unchanged:

| Route | Stage · Step | Title |
|---|---|---|
| `/` | — (no step indicator) | Three-stage landing |
| `/workshop` | Stage 1 · Step 1 of 4 | Introduction |
| `/activity` | Stage 1 · Step 2 of 4 | Define Your Challenges |
| `/activity/processing` | Stage 1 · Step 3 of 4 | AI Analysis |
| `/activity/results` | Stage 1 · Step 4 of 4 | Review & Prioritise |

---

### 3 · Header update

**On the landing page (`/`):**
The header shows no step indicator. Just the wordmark and the Admin link. The progress bar row is hidden entirely.

**On all Stage 1 pages (`/workshop`, `/activity`, `/activity/processing`, `/activity/results`):**
Add a stage/step badge to the right of the wordmark (or left of the progress bar):

```
Strategy Unbounded        [Stage 1 · Step 2 of 4]  ——●——○  Admin
```

The badge shows:
- `Stage 1 · Search` as a slim label
- `Step X of 4` as the step counter
- The existing coloured progress bar dots remain to the right of it

The Zustand `step` field maps: 1 = `/workshop`, 2 = `/activity`, 3 = `/processing`, 4 = `/results`. This is unchanged — the label text is what changes.

---

### 4 · Design language

All new UI follows the existing token set:
- Colours: `bg-surface`, `border-border-brand`, `text-indigo-brand`, `bg-gradient-action`, `text-violet-brand`, `text-text-muted`
- Typography: `font-serif italic` for H1, `font-extrabold` for stage names, `font-mono` for stage numbers and kickers, `text-text-muted` for cognitive bound descriptions
- Radius: `rounded-xl2`, `rounded-xl3`
- Shadows: `shadow-card`, `shadow-card-hover`
- Transitions: `hover:-translate-y-1 hover:shadow-card-hover`

Stage 1 card: full opacity, `border-violet-brand`, `bg-gradient-action` strip at top (same as modal header).
Stage 2 & 3 cards: `opacity-50` or `text-text-muted` throughout, no coloured strip, no hover lift — visually "inert" without adding copy about being locked.

---

## Files to create or modify

| File | Action | Reason |
|---|---|---|
| `frontend/app/page.tsx` | **Rewrite** | New 3-stage landing |
| `frontend/app/workshop/page.tsx` | **Create** | Move old Benjamin intro here (Step 1 of 4) |
| `frontend/components/Header.tsx` | **Edit** | Hide step bar on landing; show Stage 1 · Step X of 4 on workshop pages |
| `frontend/lib/store.ts` | **No change** | Step 1–4 mapping unchanged |

---

## Open questions (none — all answered)

All design decisions above are derived from the user's explicit answers:
1. Landing is informational only; Stage 2 & 3 are visually inactive with no click behaviour.
2. Landing sits before the current intro; "Start" leads into Stage 1 (which begins at the Benjamin intro, now `/workshop`).
3. Stage/step context appears on all inner pages.
4. No avatar on the landing page.
5. Header shows "Stage 1 · Step X of 4" on inner pages.
6. Academic/conceptual language from the slides is used verbatim or closely adapted.
