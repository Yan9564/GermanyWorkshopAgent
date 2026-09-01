# Implementation Plan

Three features: `also_addresses` cross-problem tracking, `failed` session status, and the agent evaluation harness.

---

## Feature 1 — `also_addresses` (cross-problem solution tracking)

**8 file changes.** Backend first (DB → agent → router), then frontend (types → components).

---

### 1.1 New file: `backend/migrations/002_also_addresses.sql`

Single idempotent statement. Safe to run every startup.

```sql
ALTER TABLE use_cases ADD COLUMN IF NOT EXISTS also_addresses INTEGER[] NOT NULL DEFAULT '{}';
```

---

### 1.2 Modify: `backend/database.py`

Currently hardcodes `001_initial.sql`. Change it to run all `.sql` files in the migrations directory in alphabetical order. This is the pattern needed so future migrations follow the same convention.

**Replace** this block (lines 28–30):
```python
migration_sql = (Path(__file__).parent / "migrations" / "001_initial.sql").read_text()
async with _pool.acquire() as conn:
    await conn.execute(migration_sql)
```

**With:**
```python
migrations_dir = Path(__file__).parent / "migrations"
migration_files = sorted(migrations_dir.glob("*.sql"))
async with _pool.acquire() as conn:
    for migration_file in migration_files:
        await conn.execute(migration_file.read_text())
```

The `settings` seed INSERT stays in the same `async with` block immediately after.

---

### 1.3 Modify: `backend/agents/brainstorm_agent.py`

Three sub-changes.

**Sub-change A — add `also_addresses` field to `UseCaseSchema`.**

Add after the `estimated_cost_roi` field:

```python
also_addresses: list[int] = Field(
    default_factory=list,
    description=(
        "Indices (0-based, 0 to 4) of OTHER problems (not the primary one) "
        "that this solution also meaningfully addresses. Leave empty if the "
        "solution only addresses the primary problem. Do not inflate this list — "
        "only include problems where the solution provides genuine value."
    ),
)
```

**Sub-change B — add instruction in `_build_prompt()`.**

Add this paragraph at the end of the final `parts.append(...)` block (after the existing requirements list):

```
\n- If this solution meaningfully addresses any other workshop problem (not the primary one), "
"list their 0-based indices in also_addresses. Leave it empty if the solution is specific "
"to the primary problem only.
```

Exact placement: append it to the multi-line string that ends with `"- how_it_works must contain 3-5 steps, each a full sentence"`. Add `\n- If this solution...` as a new bullet at the end of that string.

**Sub-change C — include `also_addresses` in the returned dict.**

In the list comprehension returned by `analyse_problem`, add after `"estimated_cost_roi"`:

```python
"also_addresses": list(uc.also_addresses),
```

---

### 1.4 Modify: `backend/routers/brainstorm.py`

Two sub-changes.

**Sub-change A — add `alsoAddresses` to `_use_case_to_api()`.**

Add after `"estimatedCostRoi"`:

```python
"alsoAddresses": uc["also_addresses"],
```

**Sub-change B — add `also_addresses` to the INSERT.**

Current INSERT has 15 columns and parameters `$1`–`$15`. Extend to 16.

Column list: add `also_addresses` after `estimated_cost_roi`.

Values list: add `$16` after `$12` (estimated_cost_roi).

Execute call: add `uc["also_addresses"]` as the 16th positional argument after `uc["estimated_cost_roi"]`.

The full extended INSERT signature becomes:
```sql
INSERT INTO use_cases (
    id, session_id, problem_id, problem_index,
    title, summary, description, how_it_works,
    data_required, time_to_implement, complexity,
    estimated_cost_roi, also_addresses, ai_priority, user_priority, feedback
) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
```

And the execute call arguments in order:
```python
uc["id"], uc["session_id"], uc["problem_id"], uc["problem_index"],
uc["title"], uc["summary"], uc["description"], uc["how_it_works"],
uc["data_required"], uc["time_to_implement"], uc["complexity"],
uc["estimated_cost_roi"], uc["also_addresses"], None, None, None,
```

Note: `also_addresses` goes before `ai_priority`/`user_priority`/`feedback` (the three `None` values) because the column definition order matters and it matches the DB column order defined in the migration.

---

### 1.5 Modify: `backend/agents/priority_agent.py`

Add `also_addresses` count to the listing prompt so the model has the tiebreaker signal.

**In `nominate_priorities`**, change the `listing` string from:

```python
listing = "\n".join(
    f"ID={uc['id']} | Problem {uc['problem_index'] + 1} | "
    f"Complexity={uc['complexity']} | {uc['title']} — {uc['summary']} | "
    f"Cost/ROI: {uc['estimated_cost_roi']}"
    for uc in all_use_cases
)
```

To:

```python
listing = "\n".join(
    f"ID={uc['id']} | Problem {uc['problem_index'] + 1} | "
    f"Complexity={uc['complexity']} | {uc['title']} — {uc['summary']} | "
    f"Cost/ROI: {uc['estimated_cost_roi']} | "
    f"Also addresses: {len(uc.get('also_addresses', []))} other problem(s)"
    for uc in all_use_cases
)
```

No change to the instructions — the agent's `instructions` field already describes cross-problem span as a criterion, and the data now surfaces it numerically.

---

### 1.6 Modify: `frontend/lib/types.ts`

Add `alsoAddresses: number[]` to the `UseCase` interface, after `estimatedCostRoi`:

```ts
alsoAddresses: number[]
```

---

### 1.7 Modify: `frontend/components/UseCaseCard.tsx`

Render "Also solves: Problem X, Y" tags below the summary line, only when `uc.alsoAddresses` is non-empty.

Add this block between the summary `<div>` and the "View Details →" `<div>`:

```tsx
{uc.alsoAddresses && uc.alsoAddresses.length > 0 && (
  <div className="flex flex-wrap gap-1 mt-1">
    {uc.alsoAddresses.map((idx) => (
      <span
        key={idx}
        className="text-[0.7rem] px-2 py-0.5 rounded-full bg-tint text-indigo-brand border border-border-brand"
      >
        Also solves P{idx + 1}
      </span>
    ))}
  </div>
)}
```

---

### 1.8 Modify: `frontend/components/UseCaseModal.tsx`

Render the same tags in the modal sub-header row (after "Re: `<problem text>`").

Read the full modal before editing to find the exact location of the sub-header. The tag block to insert, after the "Re: …" sub-label:

```tsx
{live.alsoAddresses && live.alsoAddresses.length > 0 && (
  <div className="flex flex-wrap gap-1 mt-1">
    {live.alsoAddresses.map((idx) => (
      <span
        key={idx}
        className="text-[0.7rem] px-2 py-0.5 rounded-full bg-tint text-indigo-brand border border-border-brand"
      >
        Also solves P{idx + 1}
      </span>
    ))}
  </div>
)}
```

---

### 1.9 Verify: sessions router

Check `routers/sessions.py` — if it returns use cases (via `GET /api/sessions/:id`), confirm it reads `also_addresses` from the DB row and includes `alsoAddresses` in the response. If it uses a similar `_use_case_to_api()` helper or inline dict, apply the same `alsoAddresses` addition. Do this check before marking Feature 1 complete.

---

## Feature 2 — `failed` session status

**2 file changes.**

---

### 2.1 Modify: `backend/routers/brainstorm.py`

In `_stream()`, find the zero–use-case guard:

```python
if not all_use_cases:
    yield {"event": "error", "data": json.dumps({"message": "No use cases were generated. Please retry."})}
    return
```

Replace with:

```python
if not all_use_cases:
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE sessions SET status = 'failed' WHERE id = $1",
            session_id,
        )
    yield {"event": "error", "data": json.dumps({"message": "No use cases were generated. Please start a new session."})}
    return
```

The message copy changes from "retry" to "start a new session" because a `failed` session cannot be brainstormed again (the guard at the top rejects sessions with status != `active`).

---

### 2.2 Modify: `backend/routers/export.py`

Current code returns the same 409 message for both `active` (in-progress) and `failed` sessions. Differentiate them.

**Replace:**

```python
if session["status"] != "complete":
    raise HTTPException(status_code=409, detail="Brainstorming not yet complete")
```

**With:**

```python
if session["status"] == "failed":
    raise HTTPException(status_code=409, detail="Brainstorming failed — please start a new session")
if session["status"] != "complete":
    raise HTTPException(status_code=409, detail="Brainstorming not yet complete")
```

No migration needed — the `status` column is `TEXT`, so `'failed'` is a valid value already.

---

## Feature 3 — Agent evaluation harness

**9 new files.** All live under `backend/tests/` so the script runs from the backend directory with the venv active and can import `config.py` naturally.

Run command: `cd backend && python -m tests.eval.run --session SESSION_ID`

---

### 3.1 New file: `backend/tests/__init__.py`

Empty file. Makes `tests` a Python package.

---

### 3.2 New file: `backend/tests/eval/__init__.py`

Empty file.

---

### 3.3 New file: `backend/tests/eval/results/.gitkeep`

Empty file to track the directory in git. Add `backend/tests/eval/results/*.json` to `.gitignore` (see §3.9).

---

### 3.4 New file: `backend/tests/eval/judge_prompt.md`

Documents all three judge prompt templates — versioned alongside agent code. When agent prompts change, this file is reviewed and updated too.

Content:

```markdown
# Judge Prompt Templates

These prompts are used by `run.py` to evaluate agent output.
The judge model is the same Azure OpenAI deployment as the brainstorm agents
(AZURE_OPENAI_CHAT_DEPLOYMENT). Review this file whenever agent prompts change.

---

## 1. Brainstorm scoring (per problem)

Used once per problem. The judge receives the primary problem text, all use cases
for that problem, and scores each on four dimensions (0–3).

### Scoring dimensions

| Score | Relevance | Specificity | Feasibility | Diversity |
|---|---|---|---|---|
| 0 | Unrelated to the problem | Generic AI buzzwords | Unrealistic timeline or cost | Near-identical to a sibling |
| 1 | Tangentially related | Some context, mostly generic | Plausible but optimistic | Significant overlap |
| 2 | Addresses a real aspect | Specific to the problem domain | Realistic for most mid-sized orgs | Distinct with minor overlap |
| 3 | Directly and precisely solves the stated problem | Could only apply to this exact problem as described | Grounded and conservative; well-scoped for 12 months | Genuinely different angle from all siblings |

Diversity is scored relative to the other use cases in the same problem set.
Score each dimension independently without justifying a predetermined view.

---

## 2. Cross-problem precision (per also_addresses entry)

Used once per entry in any use case's `also_addresses` list.

The judge receives:
- The primary problem text
- The secondary problem text (from the `also_addresses` index)
- The use case title and description

Verdict options:
- `justified` — the use case genuinely provides meaningful value for the secondary problem
- `superficial` — the link is real but weak; the benefit to the secondary problem is minor
- `wrong` — the use case does not meaningfully address the secondary problem

---

## 3. Priority agreement (full session)

Used once per session. The judge receives all generated use cases (ID, problem index,
title, summary, complexity, cost/ROI) and independently selects the top 3 using the
same criteria as the priority agent:

1. Strategic business value (direct impact on revenue, cost, or risk)
2. Ease of implementation (prefer Low and Medium complexity)
3. Cost efficiency (lower build cost for comparable ROI)
4. Cross-problem reach as a tiebreaker only

The selection must span at least 2 different problem indices.
Return the exact IDs from the input list.
```

---

### 3.5 New file: `backend/tests/eval/run.py`

Full CLI script. Uses `pydantic-ai` and `asyncpg`. No web framework dependencies.

```python
"""
Agent quality evaluator.

Usage:
    cd backend
    python -m tests.eval.run --session SESSION_ID [--output PATH]

Fetches brainstorm output for an existing complete session from the database,
runs an LLM judge against it, and writes a structured JSON report.

Output path defaults to: tests/eval/results/<session_id>.json
"""

import argparse
import asyncio
import json
import sys
from pathlib import Path
from typing import Literal

import asyncpg
from pydantic import BaseModel, Field
from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider
from openai import AsyncAzureOpenAI

# Ensure backend root is on sys.path when run as a module from backend/
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from config import settings  # noqa: E402

# ── Judge LLM setup ────────────────────────────────────────────────────────────
_az_client = AsyncAzureOpenAI(
    api_key=settings.AZURE_OPENAI_API_KEY,
    azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
    api_version=settings.AZURE_OPENAI_API_VERSION,
)
_provider = OpenAIProvider(openai_client=_az_client)
_model = OpenAIChatModel(settings.AZURE_OPENAI_CHAT_DEPLOYMENT, provider=_provider)


# ── Pydantic output schemas for judge ──────────────────────────────────────────

class SingleUseCaseScores(BaseModel):
    title: str
    relevance: int = Field(ge=0, le=3)
    specificity: int = Field(ge=0, le=3)
    feasibility: int = Field(ge=0, le=3)
    diversity: int = Field(ge=0, le=3)


class ProblemScoresOutput(BaseModel):
    use_cases: list[SingleUseCaseScores]


class CrossProblemVerdict(BaseModel):
    verdict: Literal["justified", "superficial", "wrong"]


class JudgePrioritySelection(BaseModel):
    slot_1: str = Field(description="Use case ID for top priority")
    slot_2: str = Field(description="Use case ID for second priority")
    slot_3: str = Field(description="Use case ID for third priority")
    reasoning: str = Field(description="1-2 sentences explaining the selection")


# ── Agents ─────────────────────────────────────────────────────────────────────

_brainstorm_judge = Agent(
    model=_model,
    output_type=ProblemScoresOutput,
    instructions=(
        "You are an expert AI strategy evaluator. Score each AI use case on four "
        "dimensions (0-3 each): Relevance, Specificity, Feasibility, and Diversity. "
        "Diversity is scored relative to the other use cases in the same set. "
        "Score each dimension independently. Be strict — a 3 must be genuinely "
        "outstanding, not merely adequate."
    ),
    retries=2,
)

_cross_problem_judge = Agent(
    model=_model,
    output_type=CrossProblemVerdict,
    instructions=(
        "You are evaluating whether an AI use case genuinely addresses a secondary "
        "business problem. Answer: 'justified' if the use case provides meaningful value "
        "for the secondary problem, 'superficial' if the link is real but weak, "
        "'wrong' if the use case does not meaningfully address the secondary problem."
    ),
    retries=2,
)

_priority_judge = Agent(
    model=_model,
    output_type=JudgePrioritySelection,
    instructions=(
        "You are selecting the top 3 AI use cases from a workshop. Criteria in order: "
        "(1) Strategic business value, (2) Ease of implementation — prefer Low/Medium "
        "complexity, (3) Cost efficiency. Cross-problem reach is a tiebreaker only. "
        "The 3 selected use cases must span at least 2 different problem indices. "
        "Return the exact ID strings from the input."
    ),
    retries=2,
)


# ── DB fetch ───────────────────────────────────────────────────────────────────

async def fetch_session_data(session_id: str) -> dict:
    conn = await asyncpg.connect(settings.DATABASE_URL)
    try:
        session = await conn.fetchrow(
            "SELECT id, status FROM sessions WHERE id = $1", session_id
        )
        if not session:
            raise SystemExit(f"Session {session_id} not found.")
        if session["status"] != "complete":
            raise SystemExit(
                f"Session status is '{session['status']}' — evaluator requires 'complete'."
            )

        problems = await conn.fetch(
            "SELECT id, idx, text FROM problems WHERE session_id = $1 ORDER BY idx",
            session_id,
        )

        use_cases = await conn.fetch(
            "SELECT id, problem_id, problem_index, title, summary, description, "
            "how_it_works, data_required, time_to_implement, complexity, "
            "estimated_cost_roi, also_addresses, ai_priority, user_priority "
            "FROM use_cases WHERE session_id = $1 ORDER BY problem_index, id",
            session_id,
        )

        return {
            "session_id": session_id,
            "problems": [{"id": p["id"], "idx": p["idx"], "text": p["text"]} for p in problems],
            "use_cases": [dict(uc) for uc in use_cases],
        }
    finally:
        await conn.close()


# ── Evaluation stages ──────────────────────────────────────────────────────────

async def score_brainstorm(problems: list[dict], use_cases: list[dict]) -> list[dict]:
    """Score all use cases per problem. Returns per-problem results."""
    problem_texts = {p["idx"]: p["text"] for p in problems}
    ucs_by_problem: dict[int, list[dict]] = {}
    for uc in use_cases:
        ucs_by_problem.setdefault(uc["problem_index"], []).append(uc)

    async def score_problem(idx: int, ucs: list[dict]) -> dict:
        problem_text = problem_texts[idx]
        uc_listing = "\n\n".join(
            f"Title: {uc['title']}\nSummary: {uc['summary']}\n"
            f"Description: {uc['description']}\nComplexity: {uc['complexity']}"
            for uc in ucs
        )
        prompt = (
            f"PRIMARY PROBLEM:\n{problem_text}\n\n"
            f"USE CASES TO SCORE (score each on Relevance, Specificity, Feasibility, "
            f"Diversity — all 0-3):\n\n{uc_listing}\n\n"
            f"Return one entry per use case in the same order, matching by title."
        )
        try:
            result = await _brainstorm_judge.run(prompt)
            scores_by_title = {s.title.lower(): s for s in result.output.use_cases}
            per_uc = []
            for uc in ucs:
                s = scores_by_title.get(uc["title"].lower())
                if s:
                    mean = (s.relevance + s.specificity + s.feasibility + s.diversity) / 4
                    per_uc.append({
                        "id": uc["id"],
                        "title": uc["title"],
                        "scores": {
                            "relevance": s.relevance,
                            "specificity": s.specificity,
                            "feasibility": s.feasibility,
                            "diversity": s.diversity,
                        },
                        "mean": round(mean, 2),
                    })
            problem_mean = round(sum(u["mean"] for u in per_uc) / len(per_uc), 2) if per_uc else 0.0
            return {"problem_index": idx, "use_cases": per_uc, "problem_mean": problem_mean}
        except Exception as exc:
            print(f"  [WARN] Brainstorm scoring failed for problem {idx}: {exc}")
            return {"problem_index": idx, "use_cases": [], "problem_mean": 0.0, "error": str(exc)}

    tasks = [score_problem(idx, ucs) for idx, ucs in sorted(ucs_by_problem.items())]
    return await asyncio.gather(*tasks)


async def check_cross_problem(problems: list[dict], use_cases: list[dict]) -> dict:
    """Verify each also_addresses entry. Returns precision metrics."""
    problem_texts = {p["idx"]: p["text"] for p in problems}
    entries = []
    for uc in use_cases:
        primary_text = problem_texts.get(uc["problem_index"], "")
        for secondary_idx in (uc.get("also_addresses") or []):
            secondary_text = problem_texts.get(secondary_idx, "")
            entries.append({
                "uc_id": uc["id"],
                "title": uc["title"],
                "description": uc["description"],
                "primary_idx": uc["problem_index"],
                "secondary_idx": secondary_idx,
                "primary_text": primary_text,
                "secondary_text": secondary_text,
            })

    if not entries:
        return {"total_entries": 0, "justified": 0, "superficial": 0, "wrong": 0, "precision": None}

    async def check_entry(e: dict) -> str:
        prompt = (
            f"PRIMARY PROBLEM:\n{e['primary_text']}\n\n"
            f"SECONDARY PROBLEM:\n{e['secondary_text']}\n\n"
            f"USE CASE: {e['title']}\n{e['description']}\n\n"
            "Does this use case genuinely address the secondary problem?"
        )
        try:
            result = await _cross_problem_judge.run(prompt)
            return result.output.verdict
        except Exception as exc:
            print(f"  [WARN] Cross-problem check failed for {e['uc_id']}: {exc}")
            return "wrong"

    verdicts = await asyncio.gather(*[check_entry(e) for e in entries])
    counts = {"justified": 0, "superficial": 0, "wrong": 0}
    for v in verdicts:
        counts[v] = counts.get(v, 0) + 1

    precision = round(counts["justified"] / len(verdicts), 2)
    return {
        "total_entries": len(verdicts),
        "justified": counts["justified"],
        "superficial": counts["superficial"],
        "wrong": counts["wrong"],
        "precision": precision,
    }


async def check_priority_agreement(problems: list[dict], use_cases: list[dict]) -> dict:
    """Independent judge selection vs agent's ai_priority. Returns agreement label."""
    agent_selection = {
        uc["id"]: uc["ai_priority"]
        for uc in use_cases
        if uc.get("ai_priority") is not None
    }
    agent_ids = {k for k, v in agent_selection.items() if v in (1, 2, 3)}
    problem_texts = {p["idx"]: p["text"] for p in problems}

    listing = "\n".join(
        f"ID={uc['id']} | Problem {uc['problem_index'] + 1} "
        f"({problem_texts.get(uc['problem_index'], '')[:60]}) | "
        f"Complexity={uc['complexity']} | {uc['title']} — {uc['summary']} | "
        f"Cost/ROI: {uc['estimated_cost_roi']}"
        for uc in use_cases
    )

    prompt = (
        f"Here are {len(use_cases)} AI use cases from a workshop:\n\n{listing}\n\n"
        "Select exactly 3 as the top priorities. The selection must span at least "
        "2 different problem indices. Return the exact ID strings shown above."
    )

    try:
        result = await _priority_judge.run(prompt)
        sel = result.output
        judge_ids = {sel.slot_1, sel.slot_2, sel.slot_3}
        overlap = len(agent_ids & judge_ids)
        agreement = (
            "full_agreement" if overlap == 3
            else "partial_agreement" if overlap == 2
            else "disagreement"
        )
        return {
            "evaluator_selection": [sel.slot_1, sel.slot_2, sel.slot_3],
            "agent_selection": [k for k, v in sorted(agent_selection.items(), key=lambda x: x[1]) if v in (1, 2, 3)],
            "agreement": agreement,
            "evaluator_reasoning": sel.reasoning,
        }
    except Exception as exc:
        print(f"  [WARN] Priority agreement check failed: {exc}")
        return {"error": str(exc)}


# ── Main ───────────────────────────────────────────────────────────────────────

async def main(session_id: str, output_path: Path) -> None:
    print(f"Fetching session {session_id} from database...")
    data = await fetch_session_data(session_id)
    problems = data["problems"]
    use_cases = data["use_cases"]
    print(f"  {len(problems)} problems, {len(use_cases)} use cases")

    print("Running evaluation (3 parallel stages)...")
    brainstorm_results, cross_problem_results, priority_results = await asyncio.gather(
        score_brainstorm(problems, use_cases),
        check_cross_problem(problems, use_cases),
        check_priority_agreement(problems, use_cases),
    )

    # Aggregate session mean
    means = [p["problem_mean"] for p in brainstorm_results if "error" not in p]
    session_mean = round(sum(means) / len(means), 2) if means else 0.0

    report = {
        "session_id": session_id,
        "problems": [p["text"] for p in sorted(problems, key=lambda x: x["idx"])],
        "brainstorm": {
            "per_problem": list(brainstorm_results),
            "session_mean": session_mean,
        },
        "cross_problem": cross_problem_results,
        "priority_agent": priority_results,
        "overall_mean": session_mean,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(report, indent=2))
    print(f"\nReport written to: {output_path}")
    print(f"  Session mean score: {session_mean:.2f} / 3.00")
    cp = cross_problem_results.get("precision")
    if cp is not None:
        print(f"  Cross-problem precision: {cp:.0%}")
    print(f"  Priority agreement: {priority_results.get('agreement', 'n/a')}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate agent output for a brainstorm session.")
    parser.add_argument("--session", required=True, help="Session ID to evaluate")
    parser.add_argument("--output", help="Output JSON path (default: tests/eval/results/<session_id>.json)")
    args = parser.parse_args()

    output = (
        Path(args.output)
        if args.output
        else Path(__file__).parent / "results" / f"{args.session}.json"
    )

    asyncio.run(main(args.session, output))
```

---

### 3.6 New file: `backend/tests/golden/set_a_manufacturing.json`

```json
{
  "name": "Manufacturing operations",
  "problems": [
    "TODO: Add manufacturing problem 1",
    "TODO: Add manufacturing problem 2",
    "TODO: Add manufacturing problem 3",
    "TODO: Add manufacturing problem 4",
    "TODO: Add manufacturing problem 5"
  ],
  "notes": "Operations-heavy: supply chain, quality control, workforce scheduling, equipment maintenance, inventory forecasting."
}
```

---

### 3.7 New file: `backend/tests/golden/set_b_retail.json`

```json
{
  "name": "Retail / customer-facing",
  "problems": [
    "TODO: Add retail problem 1",
    "TODO: Add retail problem 2",
    "TODO: Add retail problem 3",
    "TODO: Add retail problem 4",
    "TODO: Add retail problem 5"
  ],
  "notes": "Customer-facing: churn, personalisation, support volume, onboarding drop-off, feedback analysis."
}
```

---

### 3.8 New file: `backend/tests/golden/set_c_professional_services.json`

```json
{
  "name": "Professional services / cross-cutting",
  "problems": [
    "TODO: Add professional services problem 1",
    "TODO: Add professional services problem 2",
    "TODO: Add professional services problem 3",
    "TODO: Add professional services problem 4",
    "TODO: Add professional services problem 5"
  ],
  "notes": "Deliberately broad or overlapping problems to stress-test the planner's grouping logic and brainstorm specificity on harder inputs."
}
```

---

### 3.9 New file: `backend/tests/golden/baselines.json`

Initial state — nulls because no approved run exists yet. Update after the first accepted run.

```json
{
  "set_a_manufacturing": { "session_mean": null, "cross_problem_precision": null },
  "set_b_retail": { "session_mean": null, "cross_problem_precision": null },
  "set_c_professional_services": { "session_mean": null, "cross_problem_precision": null }
}
```

---

### 3.10 Add to `.gitignore`

Evaluation results should not be committed. Either add to `backend/.gitignore` (create if absent) or the repo-root `.gitignore`:

```
tests/eval/results/*.json
```

---

## Implementation order

Execute these in sequence — each step depends on the previous for testing.

1. **Feature 1 — backend**
   - Create `002_also_addresses.sql`
   - Update `database.py` to glob migrations
   - Update `brainstorm_agent.py` (all 3 sub-changes together)
   - Update `priority_agent.py` listing
   - Update `brainstorm.py` (`_use_case_to_api` + INSERT)
   - Check `sessions.py` for the extra field (§1.9)

2. **Feature 2**
   - Update `brainstorm.py` (failed status write)
   - Update `export.py` (differentiated 409 messages)

3. **Feature 1 — frontend**
   - Update `types.ts`
   - Update `UseCaseCard.tsx`
   - Update `UseCaseModal.tsx`

4. **Feature 3**
   - Create directory structure and `__init__.py` files
   - Create `judge_prompt.md`
   - Create `run.py`
   - Create golden set JSON files
   - Create `baselines.json`
   - Update `.gitignore`

---

## Edge cases and decisions recorded

| Question | Decision |
|---|---|
| Migration loading | Glob all `*.sql` in migrations dir, run in alphabetical order. Each statement must be idempotent. |
| `failed` session and re-brainstorm | The existing `active` guard prevents re-running on a `failed` session. No additional guard needed. |
| Judge model | Same `AZURE_OPENAI_CHAT_DEPLOYMENT` as brainstorm agents — no new env var. |
| Evaluator input | Session ID mode only — fetches from DB. Session must be `complete`. |
| Golden problem texts | TODO placeholders — user provides content. |
| Evaluator runner | CLI script: `python -m tests.eval.run --session SESSION_ID` |
| Results persistence | Written to `tests/eval/results/` (gitignored). `baselines.json` is committed and updated manually after approved runs. |
| `also_addresses` empty list | Stored as `{}` (Postgres `INTEGER[]` default). Frontend guards with `uc.alsoAddresses && uc.alsoAddresses.length > 0` before rendering tags. |
| Priority agent with `also_addresses` | The count is appended to the listing prompt. No change to `instructions` — the tiebreaker is already described there; the data now makes it visible. |
