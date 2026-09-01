# Frontend Integration Plan — Strategy Unbounded (Indigo Mist)

This document describes every step required to build the Next.js frontend using the **design-6-indigo-mist** design language and wire it to the existing FastAPI backend. No code is written here — this is the authoritative build plan.

---

## 1. Scaffold the Next.js Project

```
frontend/          ← create this directory at the repo root
```

```bash
cd frontend
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*"
```

Additional packages:

```bash
npm install zustand framer-motion
npm install -D @types/node
```

---

## 2. Environment Config

Create `frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

For Azure deployment this becomes the FastAPI App Service URL. The frontend never proxies — it calls FastAPI directly from the browser.

---

## 3. Design Tokens — Tailwind Config

Extend `tailwind.config.ts` to encode the full Indigo Mist palette as named colours and add Nunito as the default font. This makes every class in the project reference the design system, not arbitrary hex values.

### Colour map (from design-6-indigo-mist.html `:root`)

| Token | Hex | Tailwind key |
|---|---|---|
| `--bg` | `#F5F3FF` | `bg-page` |
| `--surface` | `#FFFFFF` | `bg-surface` |
| `--tint` | `#EDE9FE` | `bg-tint` |
| `--indigo` | `#3730A3` | `indigo-brand` |
| `--violet` | `#6D28D9` | `violet-brand` |
| `--bright` | `#818CF8` | `bright` |
| `--rose` | `#DB2777` | `rose-brand` |
| `--text` | `#1E1B4B` | `text-default` |
| `--muted` | `#6B7280` | `text-muted` |
| `--border` | `#C4B5FD` | `border-brand` |
| `--green` | `#059669` | `green-brand` |
| `--red` | `#DC2626` | `red-brand` |
| `--amber` | `#D97706` | `amber-brand` |

Priority badge colours:
- P1 → `--rose` (#DB2777) background `#FDF2F8`
- P2 → `--indigo` (#3730A3) background `#EEF2FF`
- P3 → `--muted` (#6B7280) background `#F3F4F6`

### Font

Load **Nunito** from Google Fonts in `app/layout.tsx` using `next/font/google`. Set it as the default sans-serif in `tailwind.config.ts`.

### Gradient

The primary action gradient `linear-gradient(135deg, #3730A3, #6D28D9)` is used on buttons and the modal top strip. Define it as a Tailwind `backgroundImage` utility: `gradient-action`.

---

## 4. Global Layout (`app/layout.tsx`)

- Apply the page background (`bg-page`, `#F5F3FF`), Nunito font, and `text-default` globally.
- Render the sticky `<Header>` component (logo + step-pip progress bar).
- Wrap children in the Zustand provider (no explicit provider needed — Zustand is hook-based).

---

## 5. API Client (`lib/api.ts`)

A single typed module for all backend calls. Base URL from `process.env.NEXT_PUBLIC_API_URL`.

### Functions to implement

| Function | HTTP | Path |
|---|---|---|
| `loginAdmin(pin)` | POST | `/api/auth/admin` |
| `getMe()` | GET | `/api/auth/me` |
| `getSystemPrompt()` | GET | `/api/system-prompt` |
| `updateSystemPrompt(content)` | PUT | `/api/system-prompt` |
| `resetSystemPrompt()` | POST | `/api/system-prompt/reset` |
| `createSession(problems)` | POST | `/api/sessions` |
| `getSession(id)` | GET | `/api/sessions/:id` |
| `patchVote(sessionId, ucId, priority)` | PATCH | `/api/sessions/:id/use-cases/:ucId/vote` |
| `patchFeedback(sessionId, ucId, feedback)` | PATCH | `/api/sessions/:id/use-cases/:ucId/feedback` |
| `getExportUrl(sessionId)` | — | returns URL string for the download `<a>` |
| `getAvatarGuidance(stage, context)` | POST | `/api/avatar/guidance` |
| `getAdminSessions()` | GET | `/api/admin/sessions` |
| `getAdminSession(id)` | GET | `/api/admin/sessions/:id` |

All functions use `fetch` with `credentials: 'include'` so the session cookie is sent. `patchVote` and `patchFeedback` return the server's updated object and the UI reads the `displaced` field from the vote response to update the displaced card without a full refetch.

### SSE stream (`lib/brainstorm-stream.ts`)

A separate module because SSE is not request/response:

```
openBrainstormStream(sessionId, callbacks) → () => void (cleanup)
```

`callbacks`:
- `onProblemDone(problemIndex, useCases)` — called as each of the 5 problems completes
- `onDone(sessionId, priorities)` — called when the full stream ends; `priorities` is `{1: ucId, 2: ucId, 3: ucId}`
- `onProblemError(problemIndex, message)` — called when one problem's agent fails (stream continues)
- `onError(message)` — called on connection error

Implementation uses the browser's native `EventSource` API pointed at `POST /api/brainstorm`. Because `EventSource` only supports GET, we must open it via `fetch` with `ReadableStream` and parse the SSE protocol manually (split on `\n\n`, read `event:` and `data:` lines).

---

## 6. Zustand Store (`lib/store.ts`)

Single store — no slices needed at this scale.

### State shape

```ts
interface WorkshopStore {
  // Navigation
  step: 1 | 2 | 3 | 4;

  // Session
  sessionId: string | null;
  problems: string[];         // the 5 submitted strings
  problemIds: string[];       // UUIDs from POST /api/sessions

  // Results — keyed by use-case ID
  useCases: UseCase[];        // flat list, all 15
  priorities: Record<string, 1 | 2 | 3 | null>;  // ucId → userPriority (local optimistic copy)
  feedback: Record<string, 'up' | 'down' | null>;

  // Processing state
  completedProblems: number[];  // problem indexes received so far

  // Auth
  role: 'user' | 'admin';

  // Actions
  setStep(n: 1|2|3|4): void;
  setProblems(p: string[]): void;
  setSession(sessionId: string, problemIds: string[]): void;
  addUseCasesForProblem(problemIndex: number, ucs: UseCase[]): void;
  applyPriorities(priorities: Record<string, string>): void;
  optimisticVote(ucId: string, priority: 1|2|3|null): void;
  setFeedback(ucId: string, fb: 'up'|'down'|null): void;
  setRole(r: 'user'|'admin'): void;
  reset(): void;
}
```

`optimisticVote` clears `userPriority` from any other use case that held that priority slot before setting it on the target — mirroring the backend's swap logic so the UI updates instantly without waiting for the server response.

Persist `sessionId`, `problems`, `useCases`, `priorities`, `feedback` to `localStorage` so the user can recover results on page refresh (matching the backend's `GET /api/sessions/:id` recovery path).

---

## 7. TypeScript Types (`lib/types.ts`)

```ts
interface UseCase {
  id: string;
  sessionId: string;
  problemId: string;
  problemIndex: number;
  title: string;
  summary: string;
  aiPriority: 1 | 2 | 3 | null;
  userPriority: 1 | 2 | 3 | null;
  feedback: 'up' | 'down' | null;
  description: string;
  howItWorks: string[];
  dataRequired: string;
  timeToImplement: string;
  complexity: 'Low' | 'Medium' | 'High';
  estimatedCostRoi: string;
}

type AvatarStage =
  | 'intro'
  | 'problem_input_empty'
  | 'problem_input_partial'
  | 'problem_input_ready'
  | 'processing'
  | 'results_overview'
  | 'results_with_votes'
  | 'card_detail'
  | 'card_detail_with_feedback';
```

---

## 8. Shared Components

All styled to the Indigo Mist design system.

### `components/Header.tsx`
- Logo ("Strategy Unbounded") — `font-weight:800`, `color: indigo-brand`
- Step-pip progress bar: 4 pills (40px × 8px, `border-radius: 4px`)
  - Pending: `bg-tint border-brand`
  - Active: `bg-violet-brand border-violet-brand`
  - Done: `bg-bright border-bright`
- "1 of 4" label in `text-muted`
- Reads `step` from the Zustand store

### `components/BenjaminAvatar.tsx`
- Renders `<img src="/Benjamin_Avatar.png" />` with configurable `height`
- Used on all 4 screens and in the side-panel on screen 2

### `components/SpeechBubble.tsx`
- White card, `border: 2px solid border-brand`, `border-radius: 20px`, shadow
- CSS `::after` / `::before` arrow (right side on intro; bottom on processing)
- Accepts `children` or a `text` prop with typewriter mode
- Typewriter: splits on spaces, appends word every 60 ms, renders a blinking cursor

### `components/GuideTooltip.tsx`
- Fixed FAB (52×52px, white, `border: 2px solid violet-brand`, shadow)
  - SVG robot icon matching the HTML design
  - Subtle pulse animation on first load (stops after first click)
- Click toggles a floating tooltip panel above the FAB
  - `border-left: 4px solid violet-brand`
  - Text varies per step (passed from parent or read from store)

### `components/PriorityBadge.tsx`
- Renders the correct badge for P1 (rose), P2 (indigo), P3 (grey)
- Accepts `priority: 1 | 2 | 3`

### `components/VoteButtons.tsx`
- ▲ / ▼ buttons (transparent, `color: violet-brand`)
- Calls `optimisticVote` in the store then `patchVote` in the API
- On success, reads `displaced` from the response to update any other card that lost its priority slot
- Disabled at boundaries (P1 can't go up; P3 can't go down)

### `components/PrimaryButton.tsx`
- `gradient-action` background, white text, Nunito 700, `border-radius: 50px`
- Hover: glow shadow `0 0 24px rgba(109,40,217,0.35)`, translateY(-1px)
- Disabled: `bg-gray-300`, no shadow

---

## 9. Pages

### Page 1 — Intro (`app/page.tsx`)

**Layout:** Two-column flex (left: content; right: avatar).

**Left column:**
- Eyebrow: "AI-Powered Workshop" in `text-bright`, uppercase, letter-spacing 0.12em
- Heading: "Discover AI solutions to your biggest challenges." — Nunito 800, `clamp(1.8rem, 4vw, 3.2rem)`
- `<SpeechBubble>` in typewriter mode — speech text defined as a constant
- "Benjamin · Your AI Strategy Guide" label with a violet dot
- `<PrimaryButton>` — "Begin the Activity →" — disabled until typewriter finishes

**Right column:**
- `<BenjaminAvatar>` at `clamp(260px, 42vh, 460px)`
- Three thinking dots below the avatar (violet, animated `tpulse` keyframe)

**On button click:** Calls `setStep(2)` and navigates to `/activity`.

**Avatar guidance:** On mount, call `getAvatarGuidance('intro', {})` and display the response in the speech bubble after the typewriter finishes (or use the static speech script — skip the API call on the intro to avoid cold-start latency).

---

### Page 2 — Problem Input (`app/activity/page.tsx`)

**Layout:** Two-column — form area (flex-grow) + sticky side avatar panel (hidden on mobile).

**Form area:**
- Heading + sub-heading
- 5 `<ProblemField>` components (numbered circle + `<textarea>`)
  - `border: 2px solid border-brand`, focus ring `violet-brand`
  - Character count badge `0 / 300` bottom-right (max 300 chars; backend max is 2000 but the HTML uses 300)
  - Min 10 characters to count as valid
- Submit button — disabled until all 5 fields ≥ 10 chars

**Side avatar panel:** `<BenjaminAvatar>` in a white card with `border: 2px solid border-brand`, `border-radius: 20px`, sticky at `top: 100px`.

**Avatar guidance FAB:** `<GuideTooltip>` calls `getAvatarGuidance` with the current stage:
- `problem_input_empty` when 0 filled
- `problem_input_partial` when 1–4 filled (pass `problemsFilledCount`)
- `problem_input_ready` when all 5 filled

**On submit:**
1. Call `createSession(problems)` → get `{ sessionId, problemIds, cached }`.
2. Store results with `setSession`.
3. If `cached: true` → call `getSession(sessionId)`, load results into store, navigate to `/activity/results`.
4. If `cached: false` → navigate to `/activity/processing`.

---

### Page 3 — Processing (`app/activity/processing/page.tsx`)

**Layout:** Full-screen centered column.

**Content (top to bottom):**
1. `<BenjaminAvatar>` at `clamp(120px, 18vh, 180px)`
2. `<SpeechBubble>` (bottom-pointing arrow) with a rotating message every 3 seconds:
   - "Thinking about your challenges…"
   - "Our agents are brainstorming…"
   - "Finding the best AI applications…"
   - "Almost ready for you…"
3. Steps card (white, `border-radius: 20px`):
   - "Challenges analysed" — toggled done as first `problem_done` event arrives
   - "AI use cases generating" — active while SSE stream is running
   - "Priority ranking pending" — done after `done` event
   - Each step has: pending ○, active spinning ↻ (green bg), done ✓ (green bg)
4. Progress ring SVG (80×80px, indigo→violet gradient stroke)

**On mount:**
1. Open the SSE stream via `openBrainstormStream(sessionId, callbacks)`.
2. `onProblemDone` → call `addUseCasesForProblem` in store; mark step 1 done after first problem.
3. `onDone(sessionId, priorities)` → call `applyPriorities` in store; wait 700ms; navigate to `/activity/results`.
4. `onProblemError` → show a subtle error note per problem (stream continues).
5. On unmount return the cleanup function (closes the stream).

**Avatar guidance:** Call `getAvatarGuidance('processing', {})` on mount; display in the speech bubble.

**Guard:** If `sessionId` is null in the store on mount, redirect to `/`.

---

### Page 4 — Results (`app/activity/results/page.tsx`)

**Layout:** Full-width column with a `max-width: 1200px` centered container.

**Header section:**
- "Your AI Use Cases" — Nunito 800
- Sub-text: "15 opportunities identified. Explore, vote, and flag the ones that excite you."
- Download PPT button (top-right) — links to `GET /api/sessions/:id/export/pptx` via `<a href>` download

**5 collapsible problem sections:**
Each section:
- Header row: gradient circle badge (problem number) + problem text (truncated at 80 chars) + chevron ▼/▲
- Click header to toggle `<section-body>` open/closed (CSS `max-height` transition)
- All sections start open

**Cards grid** (`auto-fit, minmax(270px, 1fr)`):
Each `<UseCaseCard>`:
- `border: 2px solid #EDE9FE`, `border-radius: 20px`, hover lift + violet border
- If `userPriority === 1`: pink top banner "⭐ Top Recommended" (`#FDF2F8`)
- Card body: top-row with `<PriorityBadge>` + `<VoteButtons>`, title, summary (2-line clamp), "View Details →" link
- Click card → open `<UseCaseModal>`

**`<GuideTooltip>`:**
- Stage `results_overview` when no votes changed
- Stage `results_with_votes` when ≥1 vote changed (track in local state)

**`<UseCaseModal>`** (rendered as a portal at page root):
- Overlay: `rgba(30,27,75,0.5)` backdrop, click outside to close
- Panel: white, `border-radius: 24px`, max-width 700px, max-height 90vh scrollable
- Top strip: 6px gradient `indigo → violet`
- Header: title (Nunito 800), "Re: <problem text>" sub-label, ✕ close button, ? guide button
- Body sections (each with a violet dot):
  - Description
  - How It Works (◆ bullet list)
  - Data Required (database SVG icon)
  - Time to Implement (clock SVG icon)
  - Complexity (Low / Medium / High chips — active chip highlighted green/amber/red)
  - Estimated Cost & ROI (bar-chart SVG icon)
- Feedback row (below a divider):
  - "Is this use case interesting?" label
  - 👍 "Interesting!" — active: `bg-rose border-rose text-white`
  - 👎 "Not relevant" — active: `bg-red border-red text-white`
  - Toggle behaviour: clicking active button clears it (sends `null` to backend)
  - Each click calls `patchFeedback` and updates the store

**? guide button in modal:** Calls `getAvatarGuidance` with stage `card_detail` or `card_detail_with_feedback` and displays the response in a small popover inside the modal header.

---

### Admin Pages

#### `/admin` — Login
- Single PIN input field + "Sign in" button
- Calls `loginAdmin(pin)`; on success navigates to `/admin/sessions`
- On failure shows "Incorrect PIN"

#### `/admin/sessions` — Session List
- Protected: calls `getMe()` on mount; redirects to `/admin` if role is not `admin`
- Table of sessions: date, status, use-case count, thumbs-up count, thumbs-down count
- Ordered newest first
- Each row links to `/admin/sessions/:id`

#### `/admin/sessions/[id]` — Session Detail
- Full session: problems, system prompt snapshot, all 15 use cases with priorities and feedback
- Same card layout as the results page but read-only (no vote/feedback controls)
- Back link to session list

#### `/admin/system-prompt` — System Prompt Editor
- Linked from a nav item visible only when `role === 'admin'`
- Loads current prompt via `getSystemPrompt()`
- `<textarea>` (full-width, min 10 rows) pre-filled with current prompt + `updatedAt` label
- "Save" button → `updateSystemPrompt(content)`
- "Reset to default" button → `resetSystemPrompt()` (confirm before sending)
- Both show a success/error toast on completion

---

## 10. Routing Map

```
/                           → Intro page (screen 1)
/activity                   → Problem input (screen 2)
/activity/processing        → Processing / SSE stream (screen 3)
/activity/results           → Results + modal (screen 4)
/admin                      → PIN login
/admin/sessions             → Session list (admin only)
/admin/sessions/[id]        → Session detail (admin only)
/admin/system-prompt        → System prompt editor (admin only)
```

---

## 11. Navigation Guards

- `/activity/processing` and `/activity/results`: redirect to `/` if `sessionId` is null.
- `/admin/sessions`, `/admin/sessions/[id]`, `/admin/system-prompt`: call `getMe()` on mount; redirect to `/admin` if role is not `admin`.
- On `/activity/results` mount: if the store has a `sessionId` but `useCases` is empty, call `getSession(sessionId)` to recover state (browser refresh path).

---

## 12. Session Recovery Flow

1. `localStorage` key: `workshop_session` — stores `{ sessionId, problems, useCases, priorities, feedback }` via Zustand persistence middleware.
2. On `/activity/results` mount: if `useCases.length === 0` and `sessionId` is set, call `getSession(sessionId)` and populate the store.
3. On `createSession` with `cached: true`: load results from `getSession` immediately; skip the processing screen.

---

## 13. Animations (Framer Motion)

| Element | Animation |
|---|---|
| Screen transition (page route change) | `fadeIn` + `translateY(8px → 0)`, 0.5s |
| Card hover | Tailwind `hover:-translate-y-1` + shadow transition |
| Modal open | `slideUp` (translateY 30px → 0, opacity 0 → 1), 0.35s |
| Guide tooltip appear | `fadeIn`, 0.2s |
| Thinking dots (avatar) | `tpulse` scale + opacity loop, 1.4s stagger |
| Step-icon spin (processing) | CSS `spin` keyframe on the ↻ icon |
| Progress ring SVG | CSS `ringFill` stroke-dashoffset 283 → 0, 4s |
| Avatar FAB pulse | CSS ring pulse, stops after first click |
| Section body open/close | CSS `max-height` transition (0 → 2000px), 0.4s |

---

## 14. Error & Loading States

| Scenario | UI |
|---|---|
| `POST /api/sessions` fails | Toast error on problem input page; button re-enabled |
| SSE stream `problem_error` event | Small error pill below the problem section header ("Problem N: <message>"). Other problems continue. |
| SSE stream connection drops | Retry once automatically; if second attempt fails, show a full-screen error with a "Try again" button |
| `patchVote` / `patchFeedback` fails | Revert optimistic update; show inline toast |
| `getSession` 404 | Redirect to `/` with a "Session not found" message |
| PPTX export `409` (still active) | Button disabled with tooltip "Results not yet complete" |

---

## 15. CORS & Cookie Notes

- The FastAPI backend already has `CORSMiddleware` with `allow_origins: ["*"]` and `allow_credentials: True`.
- For the session cookie (`workshop_session`) to be sent cross-origin, the frontend must set `credentials: 'include'` on every `fetch` call (already planned in `lib/api.ts`).
- In production, tighten `allow_origins` in `backend/main.py` to the actual frontend App Service URL and ensure the cookie's `SameSite` attribute is compatible (currently `Strict` — change to `Lax` if frontend and backend are on different domains).

---

## 16. Build & Deployment

### Local dev

```bash
# Terminal 1 — backend
cd backend && uvicorn main:app --reload --port 8000

# Terminal 2 — frontend
cd frontend && npm run dev   # http://localhost:3000
```

### Azure deployment

- **Frontend:** Azure App Service (Node.js 20 LTS)
  - Build command: `npm run build`
  - Start command: `npm start`
  - App Setting: `NEXT_PUBLIC_API_URL=https://<fastapi-service>.azurewebsites.net`
- **Backend:** existing FastAPI App Service — no changes needed for this frontend integration
- Static asset `Benjamin_Avatar.png` belongs in `frontend/public/Benjamin_Avatar.png` (copy from repo root)

---

## 17. File Tree (after implementation)

```
frontend/
  app/
    layout.tsx                 ← Nunito font, global bg, Header, GuideTooltip
    page.tsx                   ← Intro screen
    activity/
      page.tsx                 ← Problem input screen
      processing/
        page.tsx               ← SSE processing screen
      results/
        page.tsx               ← Results + modal
    admin/
      page.tsx                 ← PIN login
      sessions/
        page.tsx               ← Session list
        [id]/
          page.tsx             ← Session detail
      system-prompt/
        page.tsx               ← Prompt editor
  components/
    Header.tsx
    BenjaminAvatar.tsx
    SpeechBubble.tsx
    GuideTooltip.tsx
    PriorityBadge.tsx
    VoteButtons.tsx
    PrimaryButton.tsx
    ProblemField.tsx
    UseCaseCard.tsx
    UseCaseModal.tsx
    ProcessingSteps.tsx
  lib/
    api.ts
    brainstorm-stream.ts
    store.ts
    types.ts
  public/
    Benjamin_Avatar.png        ← copied from repo root
  tailwind.config.ts
  .env.local
```

---

## Implementation Order

1. Scaffold project + install packages
2. `tailwind.config.ts` — tokens + font
3. `lib/types.ts`
4. `lib/api.ts` + `lib/brainstorm-stream.ts`
5. `lib/store.ts`
6. Shared components (Header → Avatar → SpeechBubble → GuideTooltip → PrimaryButton → PriorityBadge → VoteButtons)
7. Intro page
8. Problem input page
9. Processing page (SSE wired up)
10. Results page + UseCaseCard + UseCaseModal
11. Admin pages (login → session list → session detail → prompt editor)
12. Navigation guards + session recovery
13. Animations pass (Framer Motion)
14. Error + loading states
15. Manual end-to-end test (intro → submit → stream → results → PPT download)
