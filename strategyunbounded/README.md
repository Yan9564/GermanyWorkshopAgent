# StrategyUnbounded

A browser-based AI strategy workshop tool. Participants submit their organisation's business problems; a pipeline of AI agents brainstorms AI use cases, streams results in real time, enables group discussion with voice capture, and produces a tailored visual representation of the chosen solution — all exportable to PowerPoint.

---

## Workshop Stages

The workshop is structured in two sequential stages.

### Stage 1 — AI Use Case Discovery

Guides individual or group participants through problem identification, AI-assisted brainstorming, and priority voting.

| Screen | Route | Purpose |
|---|---|---|
| Introduction | `/` | Avatar-guided orientation; explains the activity before it begins |
| Problem Input | `/activity` | Capture 5 business problems (min 10 chars each, max 2 000 chars each) |
| Processing | `/activity/processing` | Real-time SSE stream; shows progress as each of 5 AI agents completes |
| Results | `/activity/results` | Up to 15 AI-generated use case cards grouped by problem, with voting |
| Card Detail | Modal on `/activity/results` | Full detail: description, how it works, data required, complexity, cost/ROI, thumbs feedback |
| Discussion | `/activity/discussion` | Voice-recorded group discussion; multiple speakers, each contribution transcribed |
| Confirm Use Case | `/activity/confirm` | AI analyses the discussion transcript and recommends one use case; user confirms or overrides |

### Stage 2 — Use Case Representation

After the group confirms a use case, the app generates a tailored visual representation of that solution and enables annotation.

| Screen | Purpose |
|---|---|
| Generating | Background task runs (~20–30 s); avatar narrates what is being built |
| View | Primary representation (one of four types) rendered with full data; secondary tabs available |
| Annotating | Click-to-comment mode; annotations are stored and included in the export |

#### Representation Types

The AI selects the most appropriate primary type automatically, and offers 1–2 secondary tabs:

| Type | Best for |
|---|---|
| **Journey Map** | Process-transformation use cases — shows current vs. future steps, persona, pain points, and gains |
| **Dashboard** | Monitoring / analytics use cases — KPI cards and chart specs with realistic sample data |
| **Impact Canvas** | ROI-heavy or strategic use cases — problem statement, data requirements, metrics, ROI model, top risks |
| **Pipeline** | Data-engineering or ML pipeline use cases — nodes (source → ingest → transform → model → output → consumer) and edges |

---

## Features

### AI Agent Pipeline

Five agents work in sequence to produce workshop output.

**1. Planner Agent** (`backend/agents/planner_agent.py`)
Receives all 5 problems in one call. Analyses the problem landscape and produces per-problem metadata: key themes to explore, similarity clusters, suggested solution count (3–5), optional combined framing, and a cross-cutting hint for solution archetypes that span multiple problems. Falls back to a safe default plan on any error.

**2. Brainstorm Agent** (`backend/agents/brainstorm_agent.py`)
Called once per problem — 5 tasks run concurrently. Consumes the planner's metadata to build a rich prompt and returns structured `UseCaseSchema` output for each problem. Each use case includes: title, summary, description, how-it-works steps (3–5), data required, time to implement, complexity (Low / Medium / High), estimated cost and ROI in euros, and which other problems the solution also addresses. Timeout: 90 s per problem.

**3. Priority Agent** (`backend/agents/priority_agent.py`)
Single LLM call after all problems complete. Selects exactly 3 top use cases spanning at least 2 different problems, evaluated on strategic value, implementation ease, and cost efficiency. Validates the output before accepting; falls back to a complexity-sorted heuristic if the LLM output is invalid.

**4. Discussion Agent** (`backend/agents/discussion_agent.py`)
Analyses the concatenated voice transcript from the group discussion. Identifies which use case the group converged on, returns confidence (high / medium / low), a 2–3 sentence reasoning, and 2–4 key themes from the discussion. Handles empty transcripts with a graceful fallback to the top-ranked use case.

**5. Representation Agent** (`backend/agents/representation_agent.py`)
Receives the confirmed use case details, the original business problems, and the discussion key themes. Chooses the primary representation type, generates full structured data for it, and lighter content for 1–2 secondary types. Also produces a narration script (2–4 sentences) that the avatar speaks when the representation is revealed.

**6. Avatar Agent** (`backend/agents/avatar_agent.py`)
Stateless guidance agent. Returns context-sensitive message and next-step text for every stage of the workshop (14 named stages: `intro`, `problem_input_empty`, `problem_input_partial`, `problem_input_ready`, `processing`, `results_overview`, `results_with_votes`, `card_detail`, `card_detail_with_feedback`, `discussion`, `confirm_use_case`, `stage2_generating`, `stage2_view`, `stage2_annotating`).

### Real-Time Streaming (SSE)

`POST /api/brainstorm` returns a Server-Sent Events stream. Events:

| Event | Payload |
|---|---|
| `status` | Rotating status messages while the planner and agents work |
| `problem_done` | Problem index + all generated use cases for that problem |
| `problem_error` | Problem index + error message (timeout or agent failure) |
| `done` | Session ID + priority assignments |
| `error` | Fatal error message |

The browser receives and renders each problem's use cases as soon as that agent finishes — no waiting for all 5.

### Voice Interactions

Two voice endpoints back the discussion stage.

**Text-to-Speech** (`POST /api/voice/tts`)
Converts text to MP3 audio using Azure OpenAI's TTS service. Configurable voice via `AZURE_OPENAI_TTS_VOICE`. Returns a streaming audio response. Input capped at 4 096 characters.

**Speech-to-Text** (`POST /api/voice/stt`)
Accepts an audio file upload (WebM or any format supported by Whisper) and returns the transcript text. Uses Azure OpenAI's Whisper deployment. Input capped at 25 MB.

Discussion entries (transcript + optional speaker label) are stored in the `discussion_entries` table via `POST /api/sessions/:id/discussion` and retrieved in chronological order via `GET /api/sessions/:id/discussion`. The full concatenated transcript is what the Discussion Agent analyses.

### Priority Voting

- The Priority Agent assigns `ai_priority` (1 / 2 / 3) to 3 use cases after brainstorming.
- Users can re-rank by pressing up/down arrows on any card; the backend stores `user_priority` separately.
- A partial unique index on `(session_id, user_priority) WHERE user_priority IS NOT NULL` enforces that each priority slot can be held by only one use case at a time.

### Card Feedback

Each use case card has a thumbs-up / thumbs-down feedback control. State is persisted via `PATCH /api/sessions/:id/use-cases/:ucId/feedback`. Feedback is shown on the card and included in the PowerPoint export.

### PowerPoint Export

`GET /api/sessions/:id/export/pptx` generates and streams a `.pptx` file in memory. The deck contains:

- Title slide
- "Your 5 Problems" summary slide
- "Top Priorities" slide (Priority 1 / 2 / 3 with problem attribution)
- Per-problem section header slides
- One slide per use case showing: title, summary, description, how-it-works steps, data required, time to implement, complexity, estimated cost/ROI, priority badge, and thumbs feedback icon

### Session Caching

`POST /api/sessions` SHA-256 hashes the 5 problem texts. If a `complete` session with the same hash already exists, it is returned immediately — no duplicate LLM calls.

### Admin Panel

Protected by JWT cookie (`require_admin` dependency). Endpoints:

- `GET /api/admin/sessions` — list all sessions
- `GET /api/admin/sessions/:id` — full session detail

### System Prompt Management

Admins can customise the AI persona/context prompt used in all brainstorming calls:

- `GET /api/system-prompt` — retrieve current prompt
- `PUT /api/system-prompt` — update prompt
- `POST /api/system-prompt/reset` — reset to the `DEFAULT_SYSTEM_PROMPT` from `.env`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend framework | FastAPI (Python 3.12) |
| AI agents | pydantic-ai with Azure OpenAI (`gpt-4o-mini` default) |
| Voice (TTS) | Azure OpenAI TTS |
| Voice (STT) | Azure OpenAI Whisper |
| Streaming | Server-Sent Events via `sse-starlette` |
| Database | PostgreSQL via `asyncpg` (connection pool, SSL required) |
| Migrations | Plain SQL files in `backend/migrations/` — idempotent, run on every startup |
| PPT generation | `python-pptx` |
| Frontend framework | Next.js (App Router) + TypeScript |
| Styling | Tailwind CSS |
| Animations | Framer Motion |

---

## Running the Backend

```bash
cd backend

# One-time: create and activate venv
python -m venv venv
venv\Scripts\Activate.ps1        # Windows PowerShell
# source venv/bin/activate        # macOS / Linux

pip install -r requirements.txt

# Copy env file and fill in secrets
cp .env.example .env

# Dev server (auto-reload)
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Production startup command (Azure App Service):
```
uvicorn main:app --host 0.0.0.0 --port 8000
```

Health check: `GET /health`

## Running the Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
```

---

## Environment Variables

All must be set in `backend/.env` before the app starts.

| Variable | Purpose |
|---|---|
| `AZURE_OPENAI_API_KEY` | LLM calls (all agents) |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI base URL |
| `AZURE_OPENAI_API_VERSION` | Default: `2024-10-01-preview` |
| `AZURE_OPENAI_CHAT_DEPLOYMENT` | Chat model deployment name (default: `gpt-4o-mini`) |
| `AZURE_OPENAI_TTS_DEPLOYMENT` | TTS model deployment name |
| `AZURE_OPENAI_TTS_VOICE` | Default TTS voice (e.g. `alloy`) |
| `AZURE_OPENAI_WHISPER_DEPLOYMENT` | Whisper deployment name for STT |
| `DATABASE_URL` | PostgreSQL connection string (`asyncpg` format) |
| `ADMIN_PIN` | 4–8 digit PIN for admin login |
| `SESSION_SECRET` | Long random string for JWT signing |
| `DEFAULT_SYSTEM_PROMPT` | Factory-default AI persona prompt; seeded on first startup |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins (default: `http://localhost:3000`) |

---

## API Reference

Full API reference is documented in `backend-api.md`.

### Key endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/sessions` | Create session (or return cached) |
| `GET` | `/api/sessions/:id` | Get full session with use cases |
| `POST` | `/api/brainstorm` | SSE stream — runs the full brainstorm pipeline |
| `PATCH` | `/api/sessions/:id/use-cases/:ucId/vote` | Update user priority |
| `PATCH` | `/api/sessions/:id/use-cases/:ucId/feedback` | Record thumbs up/down |
| `GET` | `/api/sessions/:id/export/pptx` | Download PowerPoint |
| `POST` | `/api/voice/tts` | Text → MP3 audio stream |
| `POST` | `/api/voice/stt` | Audio file → transcript text |
| `POST` | `/api/sessions/:id/discussion` | Store a discussion transcript entry |
| `GET` | `/api/sessions/:id/discussion` | Retrieve all discussion entries |
| `POST` | `/api/sessions/:id/stage2/discussion-analysis` | Analyse discussion and recommend a use case |
| `POST` | `/api/sessions/:id/stage2/generate` | Trigger Stage 2 representation generation |
| `GET` | `/api/sessions/:id/stage2` | Poll Stage 2 status and retrieve result |
| `POST` | `/api/sessions/:id/stage2/annotations` | Add an annotation to a Stage 2 element |
| `GET` | `/api/sessions/:id/stage2/annotations` | Retrieve all annotations |
| `POST` | `/api/avatar/guidance` | Get avatar message + next-step text for a given stage |
| `GET` | `/api/system-prompt` | Get current system prompt |
| `PUT` | `/api/system-prompt` | Update system prompt |
| `POST` | `/api/system-prompt/reset` | Reset to default system prompt |
| `POST` | `/api/auth/admin` | Admin login (PIN → JWT cookie) |
| `GET` | `/api/auth/me` | Get current auth role |

---

## Database Schema

Four core tables plus two Stage 2 tables.

| Table | Purpose |
|---|---|
| `settings` | Key/value store — holds `system_prompt` |
| `sessions` | One row per workshop session; tracks status (`active` / `complete` / `failed`), problem hash, and system prompt snapshot |
| `problems` | 5 rows per session; stores problem index and text |
| `use_cases` | Up to 15 rows per session; all use case fields plus `ai_priority`, `user_priority`, `feedback`, and `also_addresses` (TEXT[]) |
| `discussion_entries` | One row per voice contribution; stores speaker label, transcript, and timestamp |
| `stage2_results` | One row per generation run; stores status, representation type, and JSON payload |
| `stage2_annotations` | Comments added to Stage 2 elements; keyed by `element_key` |

Migrations live in `backend/migrations/` and run automatically on startup (idempotent `CREATE TABLE IF NOT EXISTS`).

---

## Backend Module Layout

```
backend/
  main.py                    FastAPI app, CORS, router registration, lifespan hooks
  config.py                  Pydantic Settings (reads .env)
  database.py                asyncpg pool; runs migrations on startup; seeds system_prompt
  auth.py                    JWT helpers; get_role() and require_admin() dependencies
  migrations/
    001_initial.sql           Core DDL — settings, sessions, problems, use_cases
    002_...sql                Discussion entries, Stage 2 results, annotations
  agents/
    planner_agent.py          Analyses problem landscape; produces PlannerOutput
    brainstorm_agent.py       Generates use cases per problem (concurrent)
    priority_agent.py         Selects top-3 priorities across all use cases
    discussion_agent.py       Analyses voice transcript; recommends one use case
    representation_agent.py   Generates Stage 2 visual representation
    avatar_agent.py           Returns stage-specific guidance text (stateless)
  ppt/
    builder.py                build_pptx(session) → BytesIO; python-pptx
  routers/
    auth.py                   POST /api/auth/admin, GET /api/auth/me
    system_prompt.py          GET/PUT/POST /api/system-prompt
    sessions.py               POST /api/sessions, GET /api/sessions/:id
    brainstorm.py             POST /api/brainstorm (SSE stream)
    use_cases.py              PATCH vote and feedback endpoints
    export.py                 GET /api/sessions/:id/export/pptx
    voice.py                  POST /api/voice/tts and /api/voice/stt
    discussion.py             POST/GET /api/sessions/:id/discussion
    stage2.py                 Stage 2 generate, poll, annotate endpoints
    avatar.py                 POST /api/avatar/guidance
    admin.py                  GET /api/admin/sessions
```
