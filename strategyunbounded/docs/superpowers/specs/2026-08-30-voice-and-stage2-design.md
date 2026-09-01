# Design Spec: Voice Interactions + Stage 2 Representation Stage

**Date:** 2026-08-30
**Status:** Approved for implementation planning

---

## Overview

Two additions to the StrategyUnbounded workshop tool:

1. **Voice Interactions** — Benjamin (the avatar) speaks guidance text aloud via Azure OpenAI TTS; users can speak back via Whisper-powered STT. Used throughout the workshop and specifically to capture the group discussion that bridges Stage 1 and Stage 2.

2. **Stage 2: Representation Stage** — After the group discusses and agrees on their top AI use case, an AI agent generates a tailored visual representation of what that use case would look like in practice. The representation type (journey map, dashboard, impact canvas, or pipeline diagram) is chosen adaptively by the agent based on the nature of the use case. Participants can annotate the visualization with comments.

---

## Feature 1: Voice Interactions

### Goals

- Benjamin can speak any guidance message aloud (one-way TTS).
- Any participant can record a voice message; the backend transcribes it and returns text (STT).
- In the group discussion phase, each participant's voice contributions are transcribed and persisted as a shared discussion log on the session.

### Non-goals

- No real-time streaming audio or live transcription.
- No speaker diarization (distinguishing between speakers).
- No voice authentication or identity.

### Voice Provider

Azure OpenAI, using two new deployments on the existing Azure OpenAI resource:

| Deployment | Model | Purpose |
|---|---|---|
| `tts-1` | `tts-1` | Text-to-speech for the avatar |
| `whisper-1` | `whisper-1` | Speech-to-text for user input |

**New environment variables:**

```
AZURE_OPENAI_TTS_DEPLOYMENT=tts-1
AZURE_OPENAI_WHISPER_DEPLOYMENT=whisper-1
AZURE_OPENAI_TTS_VOICE=onyx
```

`AZURE_OPENAI_TTS_VOICE` selects the voice for Benjamin. Default `onyx` (deep, authoritative tone). Options: `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`.

### Backend Changes

#### New router: `backend/routers/voice.py`

Registered at `/api/voice`.

**`POST /api/voice/tts`**

```
Request body: { "text": string, "voice"?: string }
Response:     audio/mpeg stream (MP3)
```

- Calls Azure OpenAI TTS deployment.
- `voice` param overrides `AZURE_OPENAI_TTS_VOICE` if provided.
- Max text length: 4096 characters (Azure TTS limit). Returns 400 if exceeded.
- Audio is streamed directly to the client; not stored on disk.

**`POST /api/voice/stt`**

```
Request: multipart/form-data, field "audio" = audio file (WebM, WAV, MP4, M4A)
Response: { "transcript": string }
```

- Accepts browser-native `MediaRecorder` output (WebM/Opus is the default).
- Max file size: 25 MB (Whisper limit). Returns 413 if exceeded.
- Calls Azure OpenAI Whisper deployment.
- Returns the raw transcript string.

**`POST /api/sessions/:id/discussion`**

```
Request body: { "transcript": string, "speaker_label"?: string }
Response: { "id": string, "transcript": string, "recorded_at": string }
```

- Appends a transcribed contribution to the session's discussion log.
- `speaker_label` is optional freetext (e.g. "Alice", "Participant 2").
- Session must exist; returns 404 otherwise.

**`GET /api/sessions/:id/discussion`**

```
Response: { "entries": [{ "id", "speaker_label", "transcript", "recorded_at" }] }
```

- Returns all discussion entries for the session, ordered by `recorded_at`.
- Used by all participants (polling every 3s) to see the shared transcript build up.

### Database Changes

New table added to `backend/migrations/001_initial.sql` (idempotent `CREATE TABLE IF NOT EXISTS`):

```sql
CREATE TABLE IF NOT EXISTS discussion_entries (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    speaker_label TEXT,
    transcript  TEXT NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_discussion_entries_session
    ON discussion_entries(session_id, recorded_at);
```

### Frontend Changes

#### Avatar TTS — `GuideTooltip.tsx`

- Add a **speaker icon button** inside the tooltip bubble (alongside the existing text).
- On click: `POST /api/voice/tts` with the current `text`. Play the returned audio using `new Audio(objectURL)`.
- Show a loading spinner on the button while fetching; a pause/stop icon while playing.
- Add a **global mute toggle** in the `Header.tsx` (persisted in localStorage). When muted, TTS fetch is skipped.
- On stage change, if not muted, auto-play the avatar's guidance message for the new stage.

#### User STT — `VoiceRecordButton.tsx` (new component)

A reusable record button used in two contexts:
1. Inline in the GuideTooltip (for quick Q&A, if the user wants to speak instead of type).
2. On the discussion page per-participant.

Behaviour:
- **Hold to record** (mousedown/touchstart starts, mouseup/touchend stops) OR click-to-toggle.
- Uses browser `MediaRecorder` API with `audio/webm` MIME type (supported in all modern browsers).
- On stop: sends the blob to `POST /api/voice/stt`. Shows transcript in a text field below the button for the user to confirm before submitting.
- Shows elapsed recording time. Hard cutoff at 5 minutes (sends automatically).

#### Mute toggle — `Header.tsx`

A small microphone/speaker icon in the top-right of the header. Stores state in `localStorage` under `su_voice_muted`. The `GuideTooltip` reads this preference before auto-playing.

---

## Feature 2: Stage 2 — Representation Stage

### Goals

- After Stage 1, participants have a group discussion (recorded + transcribed) about which of the top-3 AI use cases to take forward.
- An AI agent analyses the discussion transcript and recommends the top use case.
- A second AI agent generates a tailored visual representation of that use case.
- All participants view the representation, can annotate it with comments, and can export it.
- Benjamin narrates the representation on load.

### Non-goals

- No regeneration of the visualization based on feedback (annotations are saved, not re-processed).
- No real-time collaborative annotation (annotations are saved per device, merged on export).
- No video recording.

### New User Flow

```
Stage 1 Results
    ↓
[button: "Start Group Discussion"]
    ↓
/activity/discussion
  ├── In-person: one shared record button → transcription appended to session log
  ├── Online: each participant on same URL records individually → transcriptions appended
  └── [button: "Finish Discussion & Analyse"]
    ↓
AI runs: discussion_agent → recommends top use case + reasoning
    ↓
/activity/confirm
  └── Shows: recommended use case title, AI reasoning from transcript
      [button: "Yes, use this →"] / [button: "Choose a different one"]
    ↓
AI runs: representation_agent → generates tailored visualization
    ↓
/activity/stage2
  ├── Primary tab: adaptive visualization (journey map / dashboard / impact canvas / pipeline)
  ├── Secondary tabs: other representation types (lighter content)
  ├── Annotation toolbar: click any element to add a comment
  └── Benjamin narrates on load (TTS)
```

### New Backend Agents

#### `backend/agents/discussion_agent.py`

Single LLM call. Structured output via pydantic-ai.

**Input:**
```python
class DiscussionAgentInput(BaseModel):
    discussion_transcript: str          # full concatenated transcript
    priority_use_cases: list[UseCaseSummary]  # the top-3 from Stage 1
```

**Output:**
```python
class DiscussionAgentOutput(BaseModel):
    recommended_use_case_id: str
    confidence: Literal["high", "medium", "low"]
    reasoning: str                      # 2-3 sentences explaining why
    key_themes_from_discussion: list[str]  # what the group cared about
```

Fallback: if transcript is empty or agent fails, defaults to the `ai_priority == 1` use case.

#### `backend/agents/representation_agent.py`

Single LLM call. Structured output via pydantic-ai.

**Input:**
```python
class RepresentationAgentInput(BaseModel):
    use_case: UseCaseDetail
    problems: list[str]                 # the 5 original problems for context
    discussion_themes: list[str]        # from discussion_agent output
```

**Output:**
```python
class RepresentationAgentOutput(BaseModel):
    primary_type: Literal["journey_map", "dashboard", "impact_canvas", "pipeline"]
    secondary_types: list[Literal["journey_map", "dashboard", "impact_canvas", "pipeline"]]  # 1-2 others
    journey_map: JourneyMapData | None
    dashboard: DashboardData | None
    impact_canvas: ImpactCanvasData | None
    pipeline: PipelineData | None
    narration_script: str               # Benjamin reads this on load (2-4 sentences)
```

The agent always generates full content for `primary_type` and lighter/summary content for `secondary_types`. Any type not in either list has `None`.

**Type-specific data models:**

```python
class JourneyMapData(BaseModel):
    persona: str                        # e.g. "Operations Manager"
    current_steps: list[JourneyStep]    # "As-Is" steps
    future_steps: list[JourneyStep]     # "To-Be" steps with AI
    pain_points: list[str]              # mapped to current steps
    gains: list[str]                    # mapped to future steps

class JourneyStep(BaseModel):
    label: str
    description: str
    time_estimate: str | None           # e.g. "4 hours"
    is_ai_powered: bool                 # True = highlighted in future view

class DashboardData(BaseModel):
    title: str
    subtitle: str
    kpi_cards: list[KPICard]            # 3-4 headline numbers
    charts: list[ChartSpec]             # 2-4 charts

class KPICard(BaseModel):
    label: str
    value: str                          # e.g. "€2.4M"
    trend: str | None                   # e.g. "+18% vs last quarter"
    unit: str | None

class ChartSpec(BaseModel):
    chart_type: Literal["bar", "line", "pie", "area", "table"]
    title: str
    description: str
    sample_data: list[dict]             # plausible sample rows

class ImpactCanvasData(BaseModel):
    problem_statement: str
    solution_overview: str
    data_required: list[DataRequirement]
    key_metrics: list[Metric]
    estimated_roi: ROIModel
    top_risks: list[Risk]

class DataRequirement(BaseModel):
    source: str
    type: str                           # e.g. "Structured", "Unstructured"
    availability: Literal["available", "needs_work", "missing"]

class Metric(BaseModel):
    name: str
    baseline: str
    target: str
    timeframe: str

class ROIModel(BaseModel):
    investment_range: str               # e.g. "€80k–€150k"
    annual_benefit: str
    payback_period: str

class Risk(BaseModel):
    description: str
    severity: Literal["Low", "Medium", "High"]
    mitigation: str

class PipelineData(BaseModel):
    nodes: list[PipelineNode]
    edges: list[PipelineEdge]

class PipelineNode(BaseModel):
    id: str
    label: str
    type: Literal["source", "ingest", "transform", "model", "output", "consumer"]
    description: str

class PipelineEdge(BaseModel):
    from_id: str
    to_id: str
    label: str | None
```

### New Backend Endpoints

Registered in `backend/routers/stage2.py` under `/api`.

**`POST /api/sessions/:id/stage2/generate`**

```
Request body: { "use_case_id": string }   # confirmed by user on /confirm page
Response: { "stage2_id": string, "status": "generating" }
```

- Validates session exists and use case belongs to session.
- Reads discussion entries for the session and concatenates transcripts.
- If a `discussion-analysis` has already been run for this session, reuses that result (stored in `stage2_results.discussion_reasoning`); otherwise runs `discussion_agent` first.
- Then runs `representation_agent` using the provided `use_case_id` (the user's confirmed choice, not necessarily the AI recommendation).
- Stores result in `stage2_results` table.
- Returns immediately with `stage2_id`; client polls `GET /api/sessions/:id/stage2` for completion.

**`GET /api/sessions/:id/stage2`**

```
Response: {
  "stage2_id": string,
  "status": "generating" | "complete" | "failed",
  "use_case_id": string,
  "recommended_use_case_id": string,
  "discussion_reasoning": string,
  "representation": RepresentationAgentOutput | null
}
```

**`POST /api/sessions/:id/stage2/discussion-analysis`**

```
Request body: {} (no body needed)
Response: { "recommended_use_case_id": string, "confidence": string, "reasoning": string }
```

- Runs `discussion_agent` against the session's discussion entries.
- Used on the `/confirm` page before the user formally triggers full Stage 2 generation.
- Can be called independently so the confirm page can show AI reasoning without generating visuals yet.

**`POST /api/sessions/:id/stage2/annotations`**

```
Request body: { "stage2_id": string, "element_key": string, "comment": string }
Response: { "id": string }
```

- `element_key` is a string identifier for the annotated element (e.g. `"kpi_card_0"`, `"journey_step_3"`, `"risk_1"`). The frontend assigns these when rendering.

**`GET /api/sessions/:id/stage2/annotations`**

```
Response: { "annotations": [{ "id", "element_key", "comment", "created_at" }] }
```

### Database Changes

New tables (added to `backend/migrations/001_initial.sql`):

```sql
CREATE TABLE IF NOT EXISTS stage2_results (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    use_case_id     UUID NOT NULL REFERENCES use_cases(id),
    status          TEXT NOT NULL DEFAULT 'generating',   -- generating | complete | failed
    discussion_reasoning TEXT,
    recommended_use_case_id UUID REFERENCES use_cases(id),
    representation_type TEXT,
    representation_payload JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_stage2_session
    ON stage2_results(session_id);  -- one Stage 2 per session

CREATE TABLE IF NOT EXISTS stage2_annotations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage2_id   UUID NOT NULL REFERENCES stage2_results(id) ON DELETE CASCADE,
    element_key TEXT NOT NULL,
    comment     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Frontend Changes

#### New pages

**`/activity/discussion`** (`frontend/app/activity/discussion/page.tsx`)

- Layout: header "Group Discussion", subtext explaining the purpose.
- Live transcript feed: polls `GET /api/sessions/:id/discussion` every 3s, renders each entry as a transcript bubble.
- Per-participant: a `VoiceRecordButton` with optional speaker label input above it.
- In-person mode: single record button (no label needed — "Facilitator").
- "Finish Discussion & Analyse" button: enabled once at least one transcript entry exists. On click, calls `POST /api/sessions/:id/stage2/discussion-analysis` → navigates to `/activity/confirm`.
- Benjamin's GuideTooltip with stage `"discussion"`.

**`/activity/confirm`** (`frontend/app/activity/confirm/page.tsx`)

- Shows the recommended use case (title, summary, problem it addresses).
- Shows `discussion_reasoning` from the discussion agent.
- Shows confidence indicator (high/medium/low).
- Two actions: "Yes, use this →" (calls `POST /api/sessions/:id/stage2/generate` with the recommended use case ID → navigates to `/activity/stage2`) and "Choose a different one" (expands to show the other 2 priority use cases as selectable cards; selecting one calls the same generate endpoint with that use case ID instead).
- Benjamin's GuideTooltip with stage `"confirm_use_case"`.

**`/activity/stage2`** (`frontend/app/activity/stage2/page.tsx`)

- On mount: polls `GET /api/sessions/:id/stage2` until status is `complete`.
- While generating: loading state with Benjamin guiding ("Generating your representation…").
- On complete:
  - Tab bar showing primary type (highlighted) + secondary types.
  - Renders the appropriate view component for the active tab.
  - Annotation toolbar toggle button (pencil icon). When active, every annotatable element gets a click handler → opens a small comment input popover → saves via `POST /api/sessions/:id/stage2/annotations`.
  - Saved annotations shown as small numbered badges on their elements.
  - Benjamin auto-plays `narration_script` via TTS on first load.
  - Export button (PPT export updated to include Stage 2 content — see below).
- GuideTooltip with stage `"stage2_view"`.

#### New visualization components

**`JourneyMapView.tsx`**

- Two-column layout: "Today" (current steps) vs "With AI" (future steps).
- Each step is a card with label, description, time estimate.
- AI-powered steps in the future column are highlighted with a gradient border.
- Pain points shown as red tags on current steps; gains shown as green tags on future steps.

**`DashboardView.tsx`**

- Grid of KPI cards at the top (3-4 cards).
- Chart area below: renders charts using Recharts (already common in Next.js stacks; add as new dependency).
- Chart types: Bar, Line, Pie, Area, and a simple Table component.
- All data is `sample_data` from the agent — clearly labelled "Illustrative data" in a subtle footer.

**`ImpactCanvasView.tsx`**

- Single-page layout with 6 sections arranged in a 2x3 grid: Problem, Solution, Data Required, Key Metrics, ROI, Risks.
- Each section has a title, icon, and content list.
- `DataRequirement` items show colour-coded availability badges.

**`PipelineView.tsx`**

- Uses `ReactFlow` (new dependency) to render a directed graph.
- Node types (source, ingest, transform, model, output, consumer) get distinct colours and icons.
- Edges are labelled.
- Read-only (no drag/edit). Fit-to-screen on mount.

#### `AnnotationLayer.tsx` (new component)

- Wraps any visualization component.
- When `annotationMode` prop is true: adds click handlers to all annotatable child elements (identified by `data-annotation-key` attribute on each annotatable element).
- On click: shows a small popover with a textarea and "Save" button.
- Saved annotations appear as a numbered yellow dot badge on the element. Clicking the badge shows the comment.
- Annotations are fetched on mount and re-fetched after each save.

### Export (PPT) — `backend/ppt/builder.py`

The existing `build_pptx()` function is extended. If a `stage2_results` row exists for the session:
- Adds a new section divider slide: "Stage 2: Representation"
- For journey map: adds a two-column slide ("Today" vs "With AI").
- For dashboard: adds KPI summary slide + one slide per chart (as a table of sample data, since PPT can't render Recharts).
- For impact canvas: adds a slide per section.
- For pipeline: adds a simplified text-based node list slide (ReactFlow diagrams can't be embedded as-is).
- Annotations are listed as speaker notes on the relevant slides.

### New avatar guidance stages

Added to `backend/agents/avatar_agent.py`:

| Stage key | When used |
|---|---|
| `"discussion"` | `/activity/discussion` page |
| `"confirm_use_case"` | `/activity/confirm` page |
| `"stage2_generating"` | While Stage 2 visuals are being generated |
| `"stage2_view"` | When Stage 2 view is ready and annotation mode is off |
| `"stage2_annotating"` | When annotation mode is active |

### New dependencies

| Package | Reason | Added to |
|---|---|---|
| `recharts` | Charts in DashboardView | `frontend/package.json` |
| `reactflow` | Pipeline diagram | `frontend/package.json` |

Both are peer-dependency-safe with Next.js 14+.

---

## State Management

`frontend/lib/store.ts` gains:

```typescript
// Voice
voiceMuted: boolean
setVoiceMuted: (v: boolean) => void

// Stage 2
stage2Id: string | null
stage2Status: 'idle' | 'generating' | 'complete' | 'failed'
stage2Data: RepresentationAgentOutput | null
selectedUseCaseId: string | null
setStage2: (id: string, status: string, data: RepresentationAgentOutput | null) => void
setSelectedUseCase: (id: string) => void
```

---

## Open Items

None — all design decisions have been resolved in the brainstorming session.

---

## Implementation Scope Summary

| Area | New files | Modified files |
|---|---|---|
| Backend | `routers/voice.py`, `routers/stage2.py`, `agents/discussion_agent.py`, `agents/representation_agent.py` | `agents/avatar_agent.py`, `ppt/builder.py`, `migrations/001_initial.sql`, `config.py`, `main.py` |
| Frontend pages | `app/activity/discussion/page.tsx`, `app/activity/confirm/page.tsx`, `app/activity/stage2/page.tsx` | `app/activity/results/page.tsx` (add "Start Group Discussion" button) |
| Frontend components | `VoiceRecordButton.tsx`, `JourneyMapView.tsx`, `DashboardView.tsx`, `ImpactCanvasView.tsx`, `PipelineView.tsx`, `AnnotationLayer.tsx` | `GuideTooltip.tsx`, `Header.tsx` |
| Frontend lib | — | `lib/types.ts`, `lib/store.ts`, `lib/api.ts` |
| Dependencies | `recharts`, `reactflow` | — |
