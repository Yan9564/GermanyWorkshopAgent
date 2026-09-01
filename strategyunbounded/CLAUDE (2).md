# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

StrategyUnbounded is a workshop tool (Part 1: AI Use Case Discovery). Users submit 5 business problems; AI agents brainstorm AI use cases per problem, stream results via SSE, and users can vote on priorities and download a PowerPoint summary.

- **Backend**: FastAPI (Python 3.12) in `backend/`
- **Frontend**: Next.js + TypeScript in `frontend/`

---

## Running the Backend

```bash
cd backend
# One-time: create and activate venv
python -m venv venv
venv\Scripts\Activate.ps1      # Windows PowerShell
source venv/bin/activate        # macOS/Linux

pip install -r requirements.txt

# Copy env file and fill in secrets
cp .env.example .env

# Run dev server (auto-reload)
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Production startup command (Azure App Service):
```
uvicorn main:app --host 0.0.0.0 --port 8000
```

Health check: `GET /health`

---

## Required Environment Variables

See `backend/.env.example`. All must be set before the app starts:

| Variable | Purpose |
|---|---|
| `AZURE_OPENAI_API_KEY` | LLM calls (all agents) |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI base URL |
| `AZURE_OPENAI_API_VERSION` | Default: `2024-10-01-preview` |
| `AZURE_OPENAI_CHAT_DEPLOYMENT` | Default: `gpt-4o-mini` |
| `DATABASE_URL` | PostgreSQL connection string (`asyncpg` format) |
| `ADMIN_PIN` | 4–8 digit PIN for admin login |
| `SESSION_SECRET` | Long random string for JWT signing |
| `DEFAULT_SYSTEM_PROMPT` | Factory-default system prompt; seeded on first startup |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins (default: `http://localhost:3000`) |

---

## Architecture

### Agent pipeline (three-stage)

The brainstorm flow runs three agents in sequence:

1. **`planner_agent.py`** — single LLM call; analyses all 5 problems together and produces per-problem metadata (`ProblemMeta`): key themes, similar-problem indices, suggested solution count (3–5), optional combined framing, and a cross-cutting hint. Falls back to a default plan on error.

2. **`brainstorm_agent.py`** — called once per problem (5 concurrent `asyncio.Task`s); consumes the planner output to build a rich prompt, then calls Azure OpenAI via `pydantic-ai` to generate structured `UseCaseSchema` output. Timeout: 90 s per problem.

3. **`priority_agent.py`** (`nominate_priorities`)  — single LLM call after all problems complete; selects exactly 3 top use cases spanning ≥ 2 problems, validated before accepting. Falls back to sorting by complexity if the LLM output is invalid.

All agents use **pydantic-ai** (`pydantic_ai.Agent`) with `OpenAIChatModel` + `OpenAIProvider` wrapping an `AsyncAzureOpenAI` client. Structured output is enforced via Pydantic models passed as `output_type`.

### Backend module layout

```
backend/
  main.py            — FastAPI app, CORS, router registration, lifespan hooks
  config.py          — Pydantic Settings (reads .env)
  database.py        — asyncpg connection pool; runs migration on startup; seeds system_prompt
  auth.py            — JWT helpers; get_role() and require_admin() FastAPI dependencies
  migrations/
    001_initial.sql  — All DDL (settings, sessions, problems, use_cases tables + indexes)
  agents/
    planner_agent.py     — Analyses problem landscape; produces PlannerOutput with ProblemMeta per problem
    brainstorm_agent.py  — Generates use cases for one problem using planner guidance
    priority_agent.py    — Selects top-3 priorities across all generated use cases
    avatar_agent.py      — Stateless guidance agent; single non-streaming call per stage
  ppt/
    builder.py       — build_pptx(session) → BytesIO; uses python-pptx
  routers/
    auth.py          — POST /api/auth/admin, GET /api/auth/me
    system_prompt.py — GET/PUT /api/system-prompt, POST /api/system-prompt/reset
    sessions.py      — POST /api/sessions (create or cache-hit), GET /api/sessions/:id
    brainstorm.py    — POST /api/brainstorm → EventSourceResponse (SSE stream)
    use_cases.py     — PATCH /api/sessions/:id/use-cases/:ucId/vote|feedback
    export.py        — GET /api/sessions/:id/export/pptx
    avatar.py        — POST /api/avatar/guidance
    admin.py         — GET /api/admin/sessions, GET /api/admin/sessions/:id
```

### Key data flows

**Brainstorm (SSE stream — `POST /api/brainstorm`):**
1. Validates session is `active` with no existing use cases
2. Calls `plan_brainstorm()` — single fast LLM call to produce per-problem metadata
3. Launches 5 `asyncio.Task`s (one per problem) into an `asyncio.Queue`; each task calls `analyse_problem()` with its `ProblemMeta`
4. As each task completes: inserts rows to `use_cases`, emits `problem_done` SSE event
5. After all 5 complete: calls `nominate_priorities()` → sets `ai_priority` + `user_priority` on 3 rows, marks session `complete`, emits `done` event

**Session caching:** `POST /api/sessions` SHA-256 hashes the 5 problems and checks `sessions.problems_hash` — returns the cached session if a `complete` match exists.

**Auth:** Stateless JWT stored in an HTTP-only `workshop_session` cookie. `get_role()` returns `"user"` when the cookie is absent or invalid. `require_admin()` raises HTTP 403 for non-admin roles.

**PPT export:** `build_pptx()` in `ppt/builder.py` builds a deck in memory and returns a `BytesIO` buffer.

### Database schema

Four tables: `settings` (key/value), `sessions`, `problems`, `use_cases`. `use_cases.how_it_works` is a native PostgreSQL `TEXT[]` array (returned by asyncpg as a Python list). A partial unique index on `(session_id, user_priority) WHERE user_priority IS NOT NULL` enforces the one-use-case-per-priority-slot invariant.

---

## Key conventions

- All routers registered under `/api` prefix in `main.py`.
- snake_case in the DB / Python; camelCase in JSON API responses (see `_use_case_to_api()` in `routers/brainstorm.py`).
- The brainstorm agent uses `pydantic-ai`'s structured output — no tool-use loop, no JSON fence stripping. The planner and priority agents follow the same pattern.
- `database.py` runs the migration SQL on every startup (idempotent `CREATE TABLE IF NOT EXISTS`).
- The `settings` row for `system_prompt` is seeded on startup only if it doesn't exist (`ON CONFLICT DO NOTHING`).
- `DEFAULT_SYSTEM_PROMPT` in `.env` is the persona/character prompt only — generation instructions live in each agent's `instructions` field.
