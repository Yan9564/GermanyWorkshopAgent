# StrategyUnbounded — System Architecture

## Overview

A facilitator-run workshop tool (Part 1: AI Use Case Discovery). Participants submit five business problems; a three-stage AI pipeline brainstorms AI use cases per problem in real time over Server-Sent Events. Participants vote on priorities and download a PowerPoint summary.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router) + TypeScript |
| State management | Zustand with `localStorage` persistence |
| Styling | Tailwind CSS |
| Backend | FastAPI (Python 3.12) |
| Async DB driver | asyncpg (connection pool) |
| AI framework | pydantic-ai (`Agent` with structured `output_type`) |
| LLM provider | Azure OpenAI (`gpt-4o-mini` default) |
| Database | PostgreSQL |
| Auth | Stateless JWT in HTTP-only cookie (`python-jose`) |
| Real-time | Server-Sent Events (SSE via `sse-starlette`) |
| Export | python-pptx (in-memory `BytesIO`) |

---

## Repository Layout

```
strategyunbounded/
├── backend/
│   ├── main.py                  FastAPI app, CORS, router registration, lifespan
│   ├── config.py                Pydantic Settings (reads .env)
│   ├── database.py              asyncpg pool; runs migrations on startup; seeds system_prompt
│   ├── auth.py                  JWT helpers: create_session_token, get_role, require_admin
│   ├── migrations/
│   │   └── 001_initial.sql      All DDL (idempotent CREATE TABLE IF NOT EXISTS)
│   ├── agents/
│   │   ├── planner_agent.py     Stage 1: analyses all 5 problems, produces PlannerOutput
│   │   ├── brainstorm_agent.py  Stage 2: generates use cases for one problem
│   │   ├── priority_agent.py    Stage 3: selects top-3 priorities across all use cases
│   │   └── avatar_agent.py      Stateless stage-guidance lookup (no LLM call)
│   ├── ppt/
│   │   └── builder.py           build_pptx(session) → BytesIO; uses python-pptx
│   └── routers/
│       ├── auth.py              POST /api/auth/admin, GET /api/auth/me
│       ├── system_prompt.py     GET/PUT /api/system-prompt, POST /api/system-prompt/reset
│       ├── sessions.py          POST /api/sessions, GET /api/sessions/:id
│       ├── brainstorm.py        POST /api/brainstorm → EventSourceResponse (SSE)
│       ├── use_cases.py         PATCH vote and feedback endpoints
│       ├── export.py            GET /api/sessions/:id/export/pptx
│       └── avatar.py            POST /api/avatar/guidance
└── frontend/
    ├── app/
    │   ├── page.tsx             Landing page (workshop intro, 3 strategy stage cards)
    │   ├── layout.tsx           Root layout with Header
    │   ├── workshop/page.tsx    Step 1: 5-problem input form
    │   ├── activity/
    │   │   ├── page.tsx         Redirect / activity root
    │   │   ├── processing/page.tsx  Step 2: SSE progress display
    │   │   └── results/page.tsx     Step 3: use case cards + voting + export
    │   └── admin/page.tsx       Admin panel (PIN-gated)
    ├── components/
    │   └── Header.tsx           Global header (logo, admin link)
    └── lib/
        ├── store.ts             Zustand store (workshop state, optimistic voting)
        ├── brainstorm-stream.ts SSE client (manual fetch + ReadableStream)
        └── types.ts             Shared TypeScript types (UseCase, etc.)
```

---

## Frontend Pages & User Flow

```
/                      Landing — intro copy, 3 strategy stage cards (01 Search active)
        ↓ "Begin Stage 1"
/workshop              Problem input — 5 textarea fields, validation, session creation
        ↓ POST /api/sessions → POST /api/brainstorm
/activity/processing   Real-time SSE progress — status messages, per-problem done indicators
        ↓ SSE "done" event
/activity/results      Use case cards per problem, voting, feedback, PPT export
```

Admin access is at `/admin`, unlocked by entering the `ADMIN_PIN` from env (stored as JWT in cookie).

### Zustand Store (`frontend/lib/store.ts`)

Global state persisted to `localStorage` under the key `workshop-session`. Persisted fields: `sessionId`, `problems`, `problemIds`, `useCases`, `step`.

| Action | Effect |
|---|---|
| `setSession` | Stores `sessionId` and `problemIds` after POST /api/sessions |
| `addUseCasesForProblem` | Appends use cases from each SSE `problem_done` event |
| `applyPriorities` | Sets `aiPriority` and `userPriority` from SSE `done` event |
| `optimisticVote` | Immediately updates local priority, displacing the previous holder of that slot |
| `setFeedbackLocal` | Toggles up/down feedback locally (mirrors server toggle behaviour) |
| `reset` | Clears all state (new session) |

### SSE Client (`frontend/lib/brainstorm-stream.ts`)

Uses `fetch` + `ReadableStream` (not `EventSource`) so it can send a POST body. Manually parses SSE frames from a raw byte buffer split on `\n\n`. Five event types consumed:

| SSE Event | Payload |
|---|---|
| `status` | `{ message }` — keepalive/progress text during planner phase |
| `problem_done` | `{ problemIndex, useCases[] }` — one problem finished |
| `problem_error` | `{ problemIndex, message }` — one problem timed out or failed |
| `done` | `{ sessionId, priorities }` — entire pipeline complete |
| `error` | `{ message }` — fatal error; session marked `failed` |

Returns a cleanup function that calls `AbortController.abort()`.

---

## Backend API

All routes are mounted under the `/api` prefix. CORS is configured from the comma-separated `ALLOWED_ORIGINS` env var.

### Endpoint Reference

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/health` | none | Liveness check |
| `POST` | `/api/auth/admin` | none | PIN login → sets JWT cookie |
| `GET` | `/api/auth/me` | cookie | Returns current role |
| `GET` | `/api/system-prompt` | admin | Read active system prompt |
| `PUT` | `/api/system-prompt` | admin | Update system prompt |
| `POST` | `/api/system-prompt/reset` | admin | Reset to `DEFAULT_SYSTEM_PROMPT` |
| `POST` | `/api/sessions` | none | Create session or return cached hit |
| `GET` | `/api/sessions/:id` | none | Full session with problems + use cases |
| `POST` | `/api/brainstorm` | none | Start SSE stream (3-stage agent pipeline) |
| `PATCH` | `/api/sessions/:id/use-cases/:ucId/vote` | none | Set user priority (1/2/3 or null) |
| `PATCH` | `/api/sessions/:id/use-cases/:ucId/feedback` | none | Toggle up/down feedback |
| `GET` | `/api/sessions/:id/export/pptx` | none | Download PowerPoint |
| `POST` | `/api/avatar/guidance` | none | Stage-specific UI hint (static lookup) |

### Auth Model (`backend/auth.py`)

- JWT encoded with `HS256` using `SESSION_SECRET`, stored in the HTTP-only `workshop_session` cookie.
- `get_role(request)` — FastAPI dependency; returns `"admin"` or `"user"`. Falls back to `"user"` if cookie is absent or JWT is invalid (no exceptions bubble).
- `require_admin(request)` — raises HTTP 403 for non-admin roles. Used on all system-prompt and admin routes.
- Regular workshop participants are fully anonymous.

---

## Database

### Schema (`migrations/001_initial.sql`)

All tables use `CREATE TABLE IF NOT EXISTS` — migrations are idempotent and run on every startup.

```sql
settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
-- Stores the active system_prompt. Seeded on first startup from DEFAULT_SYSTEM_PROMPT env var
-- using ON CONFLICT DO NOTHING.

sessions (
  id                      TEXT PRIMARY KEY,       -- UUID
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  status                  TEXT DEFAULT 'active',   -- 'active' | 'complete' | 'failed'
  system_prompt_snapshot  TEXT NOT NULL,           -- prompt captured at session creation
  problems_hash           TEXT NOT NULL            -- SHA-256 of the 5 problem texts (for caching)
)

problems (
  id          TEXT PRIMARY KEY,
  session_id  TEXT REFERENCES sessions(id) ON DELETE CASCADE,
  idx         INTEGER NOT NULL,   -- 0–4
  text        TEXT NOT NULL
)

use_cases (
  id                 TEXT PRIMARY KEY,
  session_id         TEXT REFERENCES sessions(id) ON DELETE CASCADE,
  problem_id         TEXT REFERENCES problems(id) ON DELETE CASCADE,
  problem_index      INTEGER NOT NULL,
  title              TEXT NOT NULL,
  summary            TEXT NOT NULL,
  description        TEXT NOT NULL,
  how_it_works       TEXT[] NOT NULL,       -- native PostgreSQL TEXT array
  data_required      TEXT NOT NULL,
  time_to_implement  TEXT NOT NULL,
  complexity         TEXT NOT NULL,         -- 'Low' | 'Medium' | 'High'
  estimated_cost_roi TEXT NOT NULL,
  also_addresses     INTEGER[] NOT NULL,    -- 0-based indices of other problems this UC addresses
  ai_priority        INTEGER,              -- 1/2/3, set by priority agent
  user_priority      INTEGER,              -- 1/2/3, set by participant voting
  feedback           TEXT                  -- 'up' | 'down' | NULL
)
```

**Key constraint:**
```sql
CREATE UNIQUE INDEX uq_session_user_priority
  ON use_cases (session_id, user_priority)
  WHERE user_priority IS NOT NULL;
```
Enforces that each priority slot (1, 2, 3) can be held by at most one use case per session. The vote endpoint clears any displaced holder in the same transaction before assigning the new one.

### Connection Pool (`backend/database.py`)

asyncpg pool: `min_size=2`, `max_size=10`, 15s startup timeout. The pool is stored on `app.state.pool` and accessed via `get_pool()` (used in the SSE route) or `get_db()` (FastAPI dependency for all other routes).

### Session Caching

`POST /api/sessions` SHA-256 hashes the five problem texts (joined with `\n---\n`). If a `complete` session with that hash already exists, it returns the cached `sessionId` with `"cached": true`, skipping the entire AI pipeline.

---

## AI Agent Pipeline

All three agents share a single `AsyncAzureOpenAI` client and use **pydantic-ai**'s structured output — no JSON fence stripping or post-hoc parsing. Pydantic models are passed directly as `output_type`; the framework retries on schema mismatch.

```
POST /api/brainstorm
        │
        ├─► [1] PlannerAgent                          planner_agent.py
        │        Single LLM call. Retries: 2.
        │        Input:  5 problem texts (numbered list)
        │        Output: PlannerOutput
        │                  problem_metas: ProblemMeta × 5
        │                    index, similar_to[], key_themes[],
        │                    suggested_solution_count (3–5),
        │                    combined_statement (optional)
        │                  cross_cutting_hint: solution archetype spanning ≥2 problems
        │        Fallback: default ProblemMeta (3 generic themes) on any error or wrong count
        │
        │        During this call (20–30s), the SSE generator emits rotating
        │        "status" keepalive events every 7s to prevent browser disconnects.
        │
        ├─► [2] BrainstormAgent × 5                   brainstorm_agent.py
        │        5 concurrent asyncio.Tasks, one per problem. Timeout: 90s each. Retries: 3.
        │        Input:  one problem text + its ProblemMeta + cross_cutting_hint + system_prompt
        │        Output: BrainstormOutput → list[UseCaseSchema]
        │                  title, summary, description
        │                  how_it_works[3–5 steps]
        │                  data_required, time_to_implement
        │                  complexity: 'Low' | 'Medium' | 'High'
        │                  estimated_cost_roi (€ figures required)
        │                  also_addresses[]: 0-based indices of other problems this UC addresses
        │
        │        As each task completes:
        │          • Use cases inserted to DB (single transaction per problem)
        │          • SSE emits problem_done { problemIndex, useCases[] }
        │        On timeout or exception:
        │          • SSE emits problem_error { problemIndex, message }
        │
        └─► [3] PriorityAgent                         priority_agent.py
                 Single LLM call after all 5 tasks complete. Retries: 2.
                 Input:  all generated use cases (id, problem_index, complexity, cost/ROI, title)
                 Output: PrioritySelection → slot_1, slot_2, slot_3 (UUID strings)
                 Validation (must all pass, else fallback):
                   • Exactly 3 distinct IDs
                   • All IDs exist in the generated set
                   • IDs span at least 2 different problem indices
                 Fallback: sort by complexity (Low → Medium → High), take first 3
                 Result: ai_priority and user_priority set to 1/2/3 on the chosen rows;
                         session status → 'complete'; SSE emits done { sessionId, priorities }
```

### System Prompt

The admin-configurable persona prompt is read from `settings` at the start of each brainstorm stream and passed verbatim to each BrainstormAgent call. It is also snapshotted into `sessions.system_prompt_snapshot` at session creation, so admin changes do not affect in-flight sessions. The default persona is "Benjamin, an expert AI strategy consultant."

---

## Key Data Flows

### 1. Session Creation

```
Frontend: POST /api/sessions { problems: [5 strings] }
  → Backend: SHA-256 hash of problems
  → Check sessions WHERE problems_hash = hash AND status = 'complete'
    ├── HIT:  return { sessionId, problemIds, cached: true }
    └── MISS: INSERT sessions + INSERT problems × 5
              return { sessionId, problemIds, cached: false }
```

### 2. Brainstorm Stream

```
Frontend: POST /api/brainstorm { sessionId }  (fetch + ReadableStream)
  → Backend validates: session exists, status = 'active', no existing use_cases
  → Reads problems and system_prompt from DB
  → asyncio.create_task(plan_brainstorm(...))         ← PlannerAgent
      while running: yield SSE status events every 7s
  → asyncio.create_task(run_problem(p)) × 5           ← BrainstormAgent × 5
      for each result from asyncio.Queue:
        INSERT use_cases (transaction)
        yield SSE problem_done | problem_error
  → nominate_priorities(all_use_cases)                ← PriorityAgent
      UPDATE use_cases SET ai_priority, user_priority
      UPDATE sessions SET status = 'complete'
  → yield SSE done { sessionId, priorities }
```

### 3. Voting

```
Frontend: optimisticVote(ucId, priority) → store updated immediately
Frontend: PATCH /api/sessions/:id/use-cases/:ucId/vote { priority: 1|2|3|null }
  → Backend (transaction):
      UPDATE use_cases SET user_priority = NULL WHERE session_id = X AND user_priority = slot
      UPDATE use_cases SET user_priority = slot WHERE id = ucId
  → Returns { useCaseId, userPriority, displaced: id | null }
```

### 4. PPT Export

```
GET /api/sessions/:id/export/pptx
  → Validates session is 'complete'
  → Fetches all problems + use_cases ordered by COALESCE(user_priority, 999)
  → build_pptx(session) constructs slides in-memory:
      Slide 1: Title (blue background)
      Slide 2: Your 5 Problems
      Slide 3: Top Priorities (priority badge + title per slot)
      For each problem:
        Problem header slide (light blue background)
        One slide per use case (title, summary, description, how_it_works,
          data_required, time_to_implement, complexity, estimated_cost_roi,
          priority badge, feedback emoji)
  → StreamingResponse with Content-Disposition: attachment
```

---

## Avatar Agent

`avatar_agent.py` is a static lookup — no LLM call. It maps named UI stages to `{ message, nextStep }` guidance strings for the facilitation avatar overlay. Stages: `intro`, `problem_input_empty`, `problem_input_partial`, `problem_input_ready`, `processing`, `results_overview`, `results_with_votes`, `card_detail`, `card_detail_with_feedback`.

---

## Configuration Reference

All config is read by `config.py` (Pydantic `BaseSettings`) from `.env`.

| Variable | Default | Purpose |
|---|---|---|
| `AZURE_OPENAI_API_KEY` | required | Azure OpenAI auth key |
| `AZURE_OPENAI_ENDPOINT` | required | Azure OpenAI base URL |
| `AZURE_OPENAI_API_VERSION` | `2024-10-01-preview` | API version |
| `AZURE_OPENAI_CHAT_DEPLOYMENT` | `gpt-4o-mini` | Deployment name (all agents) |
| `DATABASE_URL` | required | PostgreSQL URL (asyncpg format) |
| `ADMIN_PIN` | required | 4–8 digit PIN for admin login |
| `SESSION_SECRET` | required | Long random string for JWT signing |
| `DEFAULT_SYSTEM_PROMPT` | Benjamin persona | Seeded to `settings` table on first startup |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated CORS origins |

Frontend env var:

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend base URL used by SSE client |

---

## Startup Sequence

```
uvicorn main:app
  → FastAPI lifespan: init_db(app)
      asyncpg.create_pool (min 2, max 10, timeout 15s)
      For each *.sql in migrations/ (sorted): conn.execute(sql)
      INSERT INTO settings (key='system_prompt', value=DEFAULT_SYSTEM_PROMPT)
        ON CONFLICT DO NOTHING
  → CORS middleware applied
  → All routers registered under /api
  → App ready — GET /health returns { "status": "ok" }
```

---

## Naming Conventions

- Python / DB: `snake_case`
- JSON API responses: `camelCase` (converted in `_use_case_to_api()` / `_use_case_to_dict()`)
- TypeScript / frontend: `camelCase`
- SSE event names: `snake_case` (`problem_done`, `problem_error`)
