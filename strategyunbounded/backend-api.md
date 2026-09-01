# Backend API Specification — Service Workshop (Part 1)

> This spec covers the backend for Part 1 only. It is a planning document — no code is written here.

---

## 1. Architecture Overview

```
Browser (Next.js)
  │
  ├─ /api/auth/admin                              ← PIN verification → session cookie
  ├─ /api/auth/me                                 ← Read current role from cookie
  │
  ├─ /api/system-prompt                           ← GET (any) / PUT (admin) / POST /reset (admin)
  │
  ├─ /api/sessions                                ← POST: create session or return cached match
  ├─ /api/sessions/:id                            ← GET: fetch full session results (any role)
  │
  ├─ /api/brainstorm                              ← POST: SSE stream; saves use cases to PostgreSQL as each problem completes
  │
  ├─ /api/sessions/:id/use-cases/:ucId/vote       ← PATCH: save user priority to PostgreSQL
  ├─ /api/sessions/:id/use-cases/:ucId/feedback   ← PATCH: save thumbs up/down to PostgreSQL
  │
  ├─ /api/sessions/:id/export/pptx                ← GET: generate and download PPT file
  │
  └─ /api/admin/sessions                          ← GET: list all sessions (admin only)
     /api/admin/sessions/:id                      ← GET: full session detail including system prompt snapshot (admin only)
```

Backend: **FastAPI (Python)** — a separate service from the Next.js frontend. The browser calls the FastAPI service directly; Next.js handles UI only with no backend proxy.  
LLM: **Azure OpenAI** via the `openai` Python SDK (Azure-configured).  
Web search: **Tavily** via `httpx` async HTTP calls.  
SSE streaming: `sse-starlette` (`EventSourceResponse`).  
Parallel sub-agents: `asyncio.gather`.  
Content storage: **Azure Database for PostgreSQL — Flexible Server** via `asyncpg`.  
Config storage: **PostgreSQL `settings` table** (one row per key; admin edits via the UI).  
Neo4j: **not used in Part 1** — reserved for Parts 2/3.

---

## 2. Services & Dependencies

### Already in `.env`

| Variable | Used for |
|---|---|
| `AZURE_OPENAI_API_KEY` | All LLM calls |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI base URL |
| `AZURE_OPENAI_CHAT_DEPLOYMENT` | `gpt-4o-mini` — brainstorm + avatar agents |
| `AZURE_OPENAI_API_VERSION` | `2024-10-01-preview` |
| `AZURE_OPENAI_EMBEDDING_DEPLOYMENT` | Not used in Part 1 |
| `AZURE_OPENAI_REALTIME_DEPLOYMENT` | Not used in Part 1 (avatar is text-only) |
| `NEO4J_PASSWORD` | Not used in Part 1 — reserved for Parts 2/3 |
| `TAVILY_API_KEY` | Web search tool for Task 1 agent ✓ already provided |

### Python packages required (`requirements.txt`)

| Package | Purpose |
|---|---|
| `fastapi` | Web framework |
| `uvicorn[standard]` | ASGI server |
| `asyncpg` | Async PostgreSQL driver |
| `openai` | Azure OpenAI SDK (set `api_type`, `api_base`, `api_version` for Azure) |
| `httpx` | Async HTTP client — Tavily web search calls |
| `sse-starlette` | Server-Sent Events via `EventSourceResponse` |
| `python-pptx` | Generate PowerPoint (.pptx) files in memory |
| `python-jose[cryptography]` | Sign and verify JWT session cookies |
| `passlib` | PIN hashing (optional but good practice) |
| `pydantic` | Request/response validation (built into FastAPI) |
| Standard library: `uuid`, `hashlib`, `asyncio` | IDs, SHA-256 hashing, parallel coroutines |

### Azure services to provision

| Service | Tier recommendation | Purpose |
|---|---|---|
| **Azure Database for PostgreSQL — Flexible Server** | Burstable B1ms (demo scale) | Persistent storage for sessions, problems, use cases |
| **Azure App Service (Python 3.12)** | B2 or P1v3 | Hosts the FastAPI backend; startup command: `uvicorn main:app --host 0.0.0.0 --port 8000` |
| **Azure App Service (Node.js 20 LTS)** | B1 or B2 | Hosts the Next.js frontend; calls FastAPI via `NEXT_PUBLIC_API_URL` env var |

### `.env` additions required

```env
# PostgreSQL (Azure Database for PostgreSQL — Flexible Server)
# Available in Azure Portal → PostgreSQL resource → Connection strings
DATABASE_URL=postgresql://adminuser:password@<server>.postgres.database.azure.com:5432/workshop?sslmode=require

# Admin auth
ADMIN_PIN=          # 4–8 digit PIN set by the workshop organiser
SESSION_SECRET=     # Long random string for signing the session cookie

# Default system prompt — seeded into settings table on first deploy.
# Also used by POST /api/system-prompt/reset to restore factory default.
# Content to be provided by the workshop organiser before first deploy.
DEFAULT_SYSTEM_PROMPT=
```

All of these are set as **Application Settings** in Azure App Service (not in a `.env` file in source control).

---

## 3. Persistence Design

### Storage split

| Data | Storage | Reason |
|---|---|---|
| Sessions, problems, use cases, votes, feedback | **PostgreSQL** (`sessions`, `problems`, `use_cases` tables) | Managed, concurrent, relational — right tool for structured data with text fields |
| System prompt | **PostgreSQL** (`settings` table, one row) | Consistent with the rest of the DB; no filesystem dependency; editable via API |
| Admin PIN | **`.env`** (`ADMIN_PIN`) / Azure App Service Application Setting | Secret; never stored in DB or exposed to client |
| Auth cookie | **Signed cookie** (stateless JWT) | No DB row needed; cookie carries `{ role: "admin" }` |
| Neo4j | Not used in Part 1 | Reserved for Parts 2/3 graph capabilities |

### PostgreSQL database schema

Four tables. `how_it_works` uses a native PostgreSQL `TEXT[]` array — no JSON serialisation needed.

```sql
-- Run once (migration)

CREATE TABLE IF NOT EXISTS settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Seed on first deploy (reads DEFAULT_SYSTEM_PROMPT from env):
-- INSERT INTO settings (key, value) VALUES ('system_prompt', $DEFAULT_SYSTEM_PROMPT) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS sessions (
  id                      TEXT PRIMARY KEY,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status                  TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'complete'
  system_prompt_snapshot  TEXT NOT NULL,
  problems_hash           TEXT NOT NULL   -- SHA-256 of the 5 problems concatenated in order; used for cache lookup
);

CREATE INDEX IF NOT EXISTS idx_sessions_hash ON sessions(problems_hash);

CREATE TABLE IF NOT EXISTS problems (
  id          TEXT PRIMARY KEY,
  session_id  TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  idx         INTEGER NOT NULL,  -- 0–4
  text        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS use_cases (
  id                 TEXT PRIMARY KEY,
  session_id         TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  problem_id         TEXT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  problem_index      INTEGER NOT NULL,
  title              TEXT NOT NULL,
  summary            TEXT NOT NULL,
  ai_priority        INTEGER,            -- NULL | 1 | 2 | 3 — LLM nominates exactly 3 across all 15; never changes
  user_priority      INTEGER,            -- NULL | 1 | 2 | 3 — user's reassignment; exactly one row per value per session
  feedback           TEXT,               -- NULL | 'up' | 'down'
  description        TEXT NOT NULL,
  how_it_works       TEXT[] NOT NULL,    -- native PostgreSQL array, e.g. ARRAY['Step 1', 'Step 2']
  data_required      TEXT NOT NULL,
  time_to_implement  TEXT NOT NULL,
  complexity         TEXT NOT NULL,      -- 'Low' | 'Medium' | 'High'
  estimated_cost_roi TEXT NOT NULL
);

-- Enforce uniqueness: within a session, only one use case may hold each user_priority value.
-- Partial unique index (NULLs are excluded from uniqueness checks in PostgreSQL).
CREATE UNIQUE INDEX IF NOT EXISTS uq_session_user_priority
  ON use_cases (session_id, user_priority)
  WHERE user_priority IS NOT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_problems_session  ON problems(session_id);
CREATE INDEX IF NOT EXISTS idx_use_cases_session ON use_cases(session_id);
CREATE INDEX IF NOT EXISTS idx_use_cases_problem ON use_cases(problem_id);
```

PostgreSQL handles concurrent connections and transactions natively — no WAL configuration needed.

### What is written and when

| Write | Trigger | Table(s) |
|---|---|---|
| Session row + 5 problem rows | `POST /api/sessions` — only when no cached match exists | `sessions`, `problems` |
| 3 use case rows per problem (priorities null) | Inside `/api/brainstorm`, after each sub-agent completes, before its `problem_done` SSE event | `use_cases` |
| `ai_priority` + `user_priority` on 3 rows | After priority nomination LLM call, before `done` SSE event | `use_cases` |
| Session status → `complete` | Final `done` SSE event | `sessions` |
| `user_priority` | `PATCH /vote` | `use_cases` |
| `feedback` | `PATCH /feedback` | `use_cases` |
| System prompt | `PUT /api/system-prompt` | `settings` (key = `'system_prompt'`) |
| System prompt snapshot | `POST /api/sessions` (reads from `settings`, writes to `sessions` row) | `sessions` |

---

## 4. Agent Specifications

### 4A. Task 1 — Brainstorming Agent

**Role:** Given 5 problems and the system prompt context, produce 15 AI use cases (3 per problem), fully populated for display.

#### Logical structure

```
Next.js route handler (orchestrator)
  └─ 5 × Problem Analyser — run in parallel via Promise.all
       └─ Tool: web_search (Tavily)
```

The orchestrator is plain server logic. It fires 5 independent Azure OpenAI tool-use agentic loops simultaneously, one per problem. Each loop may call `web_search` one or more times, then generates 3 use cases with all fields in a single structured JSON response. As each of the 5 loops finishes, the orchestrator writes results to PostgreSQL and emits an SSE event.

**Priority nomination:** The orchestrator waits for all 5 loops to finish, then makes a single additional LLM call passing all 15 generated use case titles and summaries. That call returns exactly 3 use case IDs — one for Priority 1, one for Priority 2, one for Priority 3. The orchestrator then sets `ai_priority` (and `user_priority`) on those 3 rows; the other 12 remain NULL. This is done before the `done` SSE event is emitted.

#### Tools available to each Problem Analyser

| Tool name | Description | Inputs | Outputs |
|---|---|---|---|
| `web_search` | Find real-world examples of AI being used to solve similar problems | `{ query: string, max_results: number }` | `{ results: [{ title, snippet, url }] }` |

Tavily's API is called directly (no extra SDK needed beyond `fetch`). The tool is registered as an Azure OpenAI function tool so the LLM decides when and how to call it.

#### Input to each Problem Analyser

```typescript
{
  problem: string;         // one of the 5 problem strings
  problemIndex: number;    // 0–4
  problemId: string;       // UUID from the sessions DB row
  sessionId: string;
  systemPrompt: string;    // loaded server-side from the settings table (key = 'system_prompt')
}
```

#### Output schema — `UseCase`

```typescript
interface UseCase {
  id: string;                              // UUID generated server-side
  sessionId: string;
  problemId: string;
  problemIndex: number;
  title: string;                           // ≤ 8 words; shown bold on card
  summary: string;                         // 1 sentence; shown on card face
  aiPriority: 1 | 2 | 3 | null;           // LLM nominates exactly 3 across all 15 use cases; null for the other 12; never changes
  userPriority: 1 | 2 | 3 | null;         // user's reassignment; exactly one use case per session holds each value; null for unranked
  feedback: null | "up" | "down";         // starts null; updated by PATCH /feedback
  description: string;                     // 2–4 sentences; shown in modal
  howItWorks: string[];                    // 3–5 bullet points; shown in modal
  dataRequired: string;
  timeToImplement: string;                 // e.g. "3–6 months for MVP"
  complexity: "Low" | "Medium" | "High";
  estimatedCostRoi: string;               // e.g. "£50k–£150k build, 2× ROI in 18 months"
}
```

**Priority invariant (enforced by both DB and API layer):**
- Across all 15 use cases in a session, at most one may have `aiPriority = 1`, at most one `aiPriority = 2`, at most one `aiPriority = 3`. Same rule for `userPriority`.
- The LLM is instructed to nominate exactly 3 use cases (one per priority value) across the full set of 15 it generates. The other 12 receive `null`.
- `userPriority` starts as a copy of `aiPriority` for all 15 rows. The user changes it via PATCH /vote.

#### SSE streaming protocol

```
event: problem_done
data: {"problemIndex":0,"useCases":[{...UseCase...},{...},{...}]}

event: problem_done
data: {"problemIndex":3,"useCases":[...]}

... (5 events total, emitted in completion order — not necessarily 0–4)

event: done
data: {"sessionId":"..."}

# If one problem's sub-agent fails:
event: problem_error
data: {"problemIndex":1,"message":"Search timed out"}
```

A `problem_error` does not abort the stream. The other 4 problems continue. The frontend shows a fallback state for that problem group.

---

### 4B. Avatar Moderator Agent

**Role:** Demo guide throughout the workshop. On every avatar click, the frontend sends the current stage and context. The agent responds with contextual guidance and a next-step instruction.

No tools. No memory between clicks. Fully stateless — the frontend sends all context each time.

#### Stage values (sent by frontend)

| Stage value | When |
|---|---|
| `intro` | Intro Page, avatar video playing |
| `problem_input_empty` | Problem Input Page, no fields filled |
| `problem_input_partial` | Problem Input Page, 1–4 fields filled |
| `problem_input_ready` | All 5 fields filled, not yet submitted |
| `processing` | Processing Screen |
| `results_overview` | Results Page, no card opened yet |
| `results_with_votes` | Results Page, ≥ 1 priority changed |
| `card_detail` | Card detail modal open |
| `card_detail_with_feedback` | Modal open, user has thumbed ≥ 1 card |

#### Request body

```typescript
{
  stage: AvatarStage;
  context?: {
    problemsFilledCount?: number;   // 0–5
    openCardTitle?: string;         // title of currently open card
    votesChangedCount?: number;
    feedbackGiven?: boolean;
  };
}
```

#### Response

```typescript
interface AvatarGuidanceResponse {
  message: string;    // 1–3 sentences shown in the click-to-expand popover
  nextStep: string;   // short imperative: "Fill in Problem 3 to continue"
}
```

Single non-streaming Azure OpenAI call. Max ~200 tokens output. Latency target: < 3 seconds.

---

## 5. API Endpoints

### `POST /api/auth/admin`

Verify admin PIN; issue signed HTTP-only session cookie.

**Request:** `{ "pin": "1234" }`

**200:** `{ "role": "admin" }` + `Set-Cookie: workshop_session` (HTTP-only, SameSite=Strict)

**401:** `{ "error": "Invalid PIN" }`

---

### `GET /api/auth/me`

Read role from cookie. Returns `"user"` when no valid cookie is present.

**200:** `{ "role": "admin" | "user" }`

---

### `GET /api/system-prompt`

Return the current system prompt. Readable by any role.

**200:**
```json
{
  "content": "You are an AI strategy consultant...",
  "updatedAt": "2026-08-21T10:00:00Z"
}
```

---

### `PUT /api/system-prompt`

Update and persist the system prompt. **Admin cookie required.**

**Request:** `{ "content": "..." }`

**200:** `{ "content": "...", "updatedAt": "2026-08-21T10:05:00Z" }`

**403:** `{ "error": "Admin access required" }`

**DB write:** `INSERT INTO settings (key, value, updated_at) VALUES ('system_prompt', $content, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`

---

### `POST /api/system-prompt/reset`

Restore the system prompt to the factory default (`DEFAULT_SYSTEM_PROMPT` env var). **Admin cookie required.**

No request body.

**Backend action:** Writes `DEFAULT_SYSTEM_PROMPT` to the `settings` table, same upsert as `PUT /api/system-prompt`.

**200:** `{ "content": "<default prompt text>", "updatedAt": "..." }`

**403:** `{ "error": "Admin access required" }`

---

### `POST /api/sessions`

Submit 5 problems. Returns an existing cached session if the same problems were submitted before, otherwise creates a new one. Called when the user clicks **Submit & Brainstorm**.

**Request:**
```json
{
  "problems": [
    "We spend too much time manually processing invoices...",
    "Our customer churn rate is too high...",
    "...",
    "...",
    "..."
  ]
}
```

**Backend actions (in order):**
1. Validate: exactly 5 problems, each 10–2000 characters.
2. Compute `problems_hash`: SHA-256 of the 5 strings joined in order with a fixed delimiter (e.g. `\n---\n`). Whitespace-trimmed before hashing.
3. Query `sessions` for any row where `problems_hash = $hash AND status = 'complete'`. Take the most recent if multiple exist.
4. **Cache hit** → return existing session immediately with `cached: true`. No new rows written.
5. **Cache miss** → read system prompt from `settings`, generate UUIDs, insert 1 `sessions` row + 5 `problems` rows in a PostgreSQL transaction. Return with `cached: false`.

**200 — cache miss (new session):**
```json
{
  "sessionId": "uuid",
  "problemIds": ["uuid", "uuid", "uuid", "uuid", "uuid"],
  "cached": false
}
```

**200 — cache hit (existing session):**
```json
{
  "sessionId": "existing-uuid",
  "problemIds": ["uuid", "uuid", "uuid", "uuid", "uuid"],
  "cached": true
}
```

When `cached: true` the frontend skips the Processing page and calls `GET /api/sessions/:sessionId` directly to load results.

**400:** `{ "error": "Exactly 5 problems required", "details": ["Problem 3 is too short"] }`

---

### `GET /api/sessions/:sessionId`

Fetch the full results for a session. Used by the frontend when navigating to Results from a cached session, or on page refresh (when localStorage holds the sessionId). Accessible by any role.

**Response (200):**
```json
{
  "id": "uuid",
  "status": "complete",
  "problems": [
    {
      "id": "uuid",
      "index": 0,
      "text": "We spend too much time manually processing invoices...",
      "useCases": [
        {
          "id": "uuid",
          "title": "Intelligent Invoice Processing",
          "summary": "...",
          "aiPriority": 1,
          "userPriority": 1,
          "feedback": "up",
          "description": "...",
          "howItWorks": ["Step 1...", "Step 2..."],
          "dataRequired": "...",
          "timeToImplement": "3–6 months",
          "complexity": "Medium",
          "estimatedCostRoi": "..."
        }
      ]
    }
  ]
}
```

**404** if `sessionId` does not exist.

**Note:** Does not include `systemPromptSnapshot` — that field is only returned by the admin endpoint.

---

### `POST /api/brainstorm`

Begin the brainstorming SSE stream for an existing session.

**Request:** `{ "sessionId": "uuid" }`

**Validation:** `sessionId` must reference a row in `sessions` with `status = 'active'` and zero rows in `use_cases` for that session (prevents duplicate runs).

**Response:** `Content-Type: text/event-stream`

For each problem, once its sub-agent completes:
1. Generate UUIDs for the 3 use cases.
2. Insert 3 rows into `use_cases` (all with `ai_priority = NULL`, `user_priority = NULL`) in a single PostgreSQL transaction.
3. Emit `problem_done` SSE event — use cases are included but priorities are null at this point.

After all 5 complete:
1. Run the priority nomination LLM call (see §4A) — returns 3 use case IDs with their assigned priority values.
2. `UPDATE use_cases SET ai_priority = $p, user_priority = $p WHERE id = $id` for each of the 3 nominated use cases.
3. `UPDATE sessions SET status = 'complete'`.
4. Emit `done` event — **includes priority assignments** so the frontend can update the 3 ranked cards.

```
event: done
data: {
  "sessionId": "...",
  "priorities": {
    "1": "uuid-of-priority-1-use-case",
    "2": "uuid-of-priority-2-use-case",
    "3": "uuid-of-priority-3-use-case"
  }
}
```

---

### `PATCH /api/sessions/:sessionId/use-cases/:useCaseId/vote`

Assign or remove a global priority slot (1, 2, or 3) from a use case. Since each priority value may be held by at most one use case per session, this is a **swap operation**, not a simple update.

**Request:** `{ "priority": 1 | 2 | 3 | null }`

Sending `null` removes the priority from this use case (leaves it unranked).

**Validation:** `useCaseId` must belong to `sessionId`.

**DB write (single transaction):**
1. Clear `user_priority` on any other use case in this session that currently holds the requested priority value.
2. Set `user_priority` on the target use case.

```sql
-- Step 1: clear the slot from whoever holds it
UPDATE use_cases
SET user_priority = NULL
WHERE session_id = $sessionId
  AND user_priority = $priority
  AND id != $useCaseId;

-- Step 2: assign (or clear) on the target
UPDATE use_cases
SET user_priority = $priority      -- NULL if request sent null
WHERE id = $useCaseId
  AND session_id = $sessionId;
```

The partial unique index on `(session_id, user_priority)` enforces the invariant at the DB level as a safety net.

**200:**
```json
{
  "useCaseId": "...",
  "userPriority": 1,
  "displaced": "uuid-of-use-case-that-lost-this-slot"
}
```

`displaced` is `null` if no other use case was cleared. The frontend uses this to update the previously-ranked card's badge without a full refetch.

**400 / 404** on invalid input or mismatched IDs.

---

### `PATCH /api/sessions/:sessionId/use-cases/:useCaseId/feedback`

Save thumbs up/down. Sending the already-active value toggles it off (sets to `null`).

**Request:** `{ "feedback": "up" | "down" | null }`

**DB write:** `UPDATE use_cases SET feedback = ? WHERE id = ? AND session_id = ?`

**200:** `{ "useCaseId": "...", "feedback": "up" }`

---

### `GET /api/admin/sessions`

List all sessions. **Admin cookie required.**

**200:**
```json
{
  "sessions": [
    {
      "id": "uuid",
      "createdAt": "2026-08-21T09:00:00Z",
      "status": "complete",
      "useCaseCount": 15,
      "thumbsUpCount": 4,
      "thumbsDownCount": 2
    }
  ]
}
```

Ordered by `created_at` descending. No pagination needed for a workshop demo.

---

### `GET /api/admin/sessions/:sessionId`

Full session detail including all problems and use cases. **Admin cookie required.**

**200:**
```json
{
  "id": "uuid",
  "createdAt": "2026-08-21T09:00:00Z",
  "status": "complete",
  "systemPromptSnapshot": "...",
  "problems": [
    {
      "id": "uuid",
      "index": 0,
      "text": "We spend too much time manually processing invoices...",
      "useCases": [
        {
          "id": "uuid",
          "title": "Intelligent Invoice Processing",
          "summary": "...",
          "aiPriority": 1,
          "userPriority": 1,
          "feedback": "up",
          "description": "...",
          "howItWorks": ["Step 1...", "Step 2..."],
          "dataRequired": "...",
          "timeToImplement": "3–6 months",
          "complexity": "Medium",
          "estimatedCostRoi": "..."
        }
      ]
    }
  ]
}
```

`how_it_works` is a native `TEXT[]` column in PostgreSQL and is returned as a JavaScript array directly.

---

### `GET /api/sessions/:sessionId/export/pptx`

Generate and download the full results as a PowerPoint file. Reads the final state (including user-adjusted priorities and feedback) from PostgreSQL.

No auth required — any user with a valid `sessionId` can download their own results. The session must have `status = 'complete'` (i.e. brainstorming finished).

**Response:**
```
Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation
Content-Disposition: attachment; filename="workshop-results-<sessionId>.pptx"
```

The file is generated in memory by `pptxgenjs` and streamed directly to the browser — nothing is written to disk on the server.

**404** if `sessionId` does not exist.  
**409** if session `status = 'active'` (brainstorming not yet complete).

#### Slide structure

| Slide | Content |
|---|---|
| **1 — Title** | "AI Use Case Workshop Results" · session date |
| **2 — Your Problems** | Numbered list of the 5 submitted problems |
| **3 — Top 3 Priorities** | The 3 use cases holding `userPriority` 1, 2, 3 — one per row with title, problem source, and priority badge |
| **4–N — Problem sections** | One header slide per problem, followed by one slide per use case (3 slides per problem = 15 use case slides total) |

Total slides: 3 + (5 × 4) = **23 slides**.

#### Use case slide layout (one per use case)

Each use case gets its own slide. The priority badge is shown **only** on the 3 use cases that hold a `userPriority` value; the other 12 slides have no badge.

```
┌─────────────────────────────────────────────────────┐
│ [Priority badge: P1 / P2 / P3 — only if ranked]    │
│                                [👍 or 👎 if set]   │
│                                                     │
│  TITLE (large, bold)                                │
│  Summary sentence (italic, smaller)                 │
│                                                     │
│  Description ──────────────────────────────────     │
│  2–4 sentences                                      │
│                                                     │
│  How It Works          │  Data Required             │
│  • Step 1              │  [text]                    │
│  • Step 2              │                            │
│  • Step 3              │  Time to Implement         │
│                        │  [text]                    │
│  Complexity: [chip]    │  Est. Cost / ROI           │
│                        │  [text]                    │
└─────────────────────────────────────────────────────┘
```

Priority badge colour (matches frontend Design.md):
- Priority 1 → green (`#22c55e`)
- Priority 2 → amber (`#f59e0b`)
- Priority 3 → grey (`#9ca3af`)

#### Top 3 Priorities slide layout (slide 3)

Three rows — one per priority slot. Each row shows the priority badge, the use case title, and which problem it came from. Use cases that the user left unranked do not appear here.

```
┌─────────────────────────────────────────────────────┐
│  YOUR TOP PRIORITIES                                │
│                                                     │
│  [P1 badge]  Intelligent Invoice Processing         │
│              ↳ Problem 1: "We spend too much..."   │
│                                                     │
│  [P2 badge]  Predictive Demand Forecasting          │
│              ↳ Problem 3: "We can't predict..."    │
│                                                     │
│  [P3 badge]  AI-Powered Customer Churn Model        │
│              ↳ Problem 2: "Our churn rate..."      │
└─────────────────────────────────────────────────────┘
```

If the user left one or more priority slots unassigned, those rows show "Not assigned" in grey.

---

### `POST /api/avatar/guidance`

Get contextual guidance from the avatar moderator.

**Request:**
```json
{
  "stage": "problem_input_partial",
  "context": { "problemsFilledCount": 2 }
}
```

**200:**
```json
{
  "message": "You have 2 problems entered. Try to think across different parts of the business — operations, customer-facing, and data challenges often yield the strongest AI opportunities.",
  "nextStep": "Fill in problems 3, 4, and 5 to unlock the Submit button."
}
```

No DB reads or writes on this route.

---

## 6. Auth & Roles

| Capability | User | Admin |
|---|---|---|
| View system prompt | Yes | Yes |
| Edit system prompt | No | Yes |
| Reset system prompt to default | No | Yes |
| Create / cache-hit session | Yes | Yes |
| Fetch session results | Yes | Yes |
| Trigger brainstorm | Yes | Yes |
| Vote and give feedback | Yes | Yes |
| Use avatar guidance | Yes | Yes |
| Download PPT for own session | Yes | Yes |
| List all sessions | No | Yes |
| View full session detail (incl. prompt snapshot) | No | Yes |

**Implementation:** `python-jose` — signed JWT stored in an HTTP-only cookie, payload `{ "role": "admin" }`. FastAPI reads the cookie on protected routes via a dependency. No DB row per auth session. Cookie expires on browser close (no `max_age`).

---

## 7. Azure Deployment Map

| Component | Azure Service | Notes |
|---|---|---|
| FastAPI backend | **Azure App Service** (Python 3.12) | B2 or P1v3; startup: `uvicorn main:app --host 0.0.0.0 --port 8000` |
| Next.js frontend | **Azure App Service** (Node.js 20 LTS) | B1 or B2; env var `NEXT_PUBLIC_API_URL` points to FastAPI service URL |
| Database | **Azure Database for PostgreSQL — Flexible Server** | Burstable B1ms; shared across Parts 1, 2, and 3 |
| LLM | **Azure OpenAI** (already provisioned) | `gpt-4o-mini` deployment; configured in `openai` Python SDK via env vars |
| Web search | **Tavily** (external, API key already provided) | Called via `httpx.AsyncClient` from FastAPI route handlers |
| Neo4j | **Not used in Part 1** | Reserved for Parts 2/3 |

All secrets (`DATABASE_URL`, `ADMIN_PIN`, `SESSION_SECRET`, `DEFAULT_SYSTEM_PROMPT`, Azure OpenAI keys, `TAVILY_API_KEY`) are set as **Application Settings** on the FastAPI App Service — never in source control.

---

## 8. Feasibility Assessment

| Feature | Feasible? | Notes |
|---|---|---|
| Task 1 agent with 5 parallel sub-agents | Yes | `asyncio.gather` over 5 Azure OpenAI tool-use coroutines |
| Web search (Tavily) | Yes | API key already provided; called via `httpx.AsyncClient` |
| SSE streaming + PostgreSQL writes mid-stream | Yes | `sse-starlette` `EventSourceResponse`; each problem writes to DB then yields its event |
| Avatar agent (click-to-expand) | Yes | Single `await openai.chat.completions.create(...)` call per click |
| Admin PIN auth (stateless cookie) | Yes | `python-jose` JWT in HTTP-only cookie; FastAPI dependency checks it |
| System prompt editable on Problem Input Page | Yes | `GET /api/system-prompt` reads `settings` table; admin sees editable textarea |
| System prompt snapshot per session | Yes | Read from `settings` at session creation, write to `sessions.system_prompt_snapshot` |
| Multiple simultaneous sessions, fully isolated | Yes | `asyncpg` connection pool; all rows carry `session_id` |
| Admin review of all sessions | Yes | Two admin-only endpoints query PostgreSQL |
| Data available to Parts 2/3 | Yes | All parts share the same PostgreSQL DB via `DATABASE_URL` |
| Vote + feedback persisted per interaction | Yes | Single-row `UPDATE` per PATCH call |
| `how_it_works` stored as array | Yes | Native `TEXT[]` in PostgreSQL; `asyncpg` returns it as a Python list |
| PPT export (server-side) | Yes | `python-pptx` builds the file in a `BytesIO` buffer; returned as `StreamingResponse` |
| Session cache / deduplication | Yes | `hashlib.sha256` of 5 problems; indexed on `sessions.problems_hash`; lookup before insert |
| Results recovery on refresh | Yes | `GET /api/sessions/{sessionId}` + `sessionId` stored in localStorage by frontend |
| System prompt reset to default | Yes | `DEFAULT_SYSTEM_PROMPT` env var; same upsert as PUT |

**No blockers.** All required API keys are available and the Azure services are straightforward to provision.

---

## 9. Resolved Decisions

| # | Decision |
|---|---|
| 1 | Default system prompt content will be provided by the workshop organiser and set in `DEFAULT_SYSTEM_PROMPT` env var before first deploy. Seeded into `settings` table on startup. |
| 2 | Admin can reset system prompt to factory default via `POST /api/system-prompt/reset`. |
| 3 | Submitting the same 5 problems returns the cached session (no re-run). Submitting different problems creates a new session. Results are recoverable from the server via `GET /api/sessions/:sessionId` + `sessionId` persisted in localStorage. |
| 4 | Parts 2/3 share the same PostgreSQL database. All parts use the same `DATABASE_URL`. |

**No open questions remain. The spec is ready for implementation.**
