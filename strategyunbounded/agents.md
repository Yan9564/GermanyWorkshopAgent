# Stage 1 Agents — Roles & Evaluation

Stage 1 of the StrategyUnbounded workshop ("Search") is powered by three sequential AI agents that run inside a single SSE stream. Each has a distinct responsibility, its own structured output schema, its own failure mode handling, and is evaluated by a separate LLM judge in the offline evaluation harness.

---

## Shared Infrastructure

All three agents share:

- **Same Azure OpenAI deployment** — `AZURE_OPENAI_CHAT_DEPLOYMENT` (default: `gpt-4o-mini`)
- **Same client construction** — `AsyncAzureOpenAI` → `OpenAIProvider` → `OpenAIChatModel`
- **pydantic-ai `Agent`** with a Pydantic model as `output_type` — structured output is enforced at the framework layer; the model retries automatically on schema mismatch before the agent-level retry count kicks in
- **No tool-use loop** — single inference call per agent invocation (not an agentic loop)

---

## Agent 1 — PlannerAgent

**File:** `backend/agents/planner_agent.py`  
**Called by:** `_stream()` in `routers/brainstorm.py`, once per brainstorm session  
**Runs:** Before the five brainstorm tasks are launched

### Role

The PlannerAgent does not generate solutions. It analyses the full set of five business problems submitted by participants and produces a structured research plan that every subsequent BrainstormAgent will consume. Its job is to prevent the brainstorm agents from generating generic, isolated, or redundant output by:

1. Identifying which problems share overlapping themes (`similar_to`)
2. Prescribing 2–4 specific AI solution angles to explore per problem (`key_themes`)
3. Deciding how many solutions each problem warrants — 3 by default, 4–5 only for genuinely multi-dimensional problems (`suggested_solution_count`)
4. Optionally reframing a problem that is closely related to another into a combined statement (`combined_statement`)
5. Identifying a single cross-cutting solution archetype that could span two or more problems (`cross_cutting_hint`) — this is passed to all five BrainstormAgents as shared context

### Inputs

```python
# Prompt sent to the model:
f"Here are {n} business problems submitted for an AI use case workshop:\n\n"
f"{numbered}\n\n"
"For each problem, provide:\n"
"1. similar_to: list of other problem indices (0-based) with overlapping themes\n"
"2. key_themes: 2-4 specific AI solution themes to explore\n"
"3. suggested_solution_count: 3 (default) or 4-5 only for multi-dimensional problems\n"
"4. combined_statement: optional restatement if closely related to another problem\n\n"
"Also write a cross_cutting_hint if one AI solution archetype could span 2+ problems.\n\n"
f"Return exactly {n} problem_metas ordered by index 0 to {n - 1}."
```

### Output Schema

```python
class ProblemMeta(BaseModel):
    index: int                          # 0-based problem index
    similar_to: list[int]               # indices of related problems
    key_themes: list[str]               # 2-4 AI solution directions to explore
    suggested_solution_count: int       # 3 (default) | 4 | 5
    combined_statement: str | None      # optional merged framing

class PlannerOutput(BaseModel):
    problem_metas: list[ProblemMeta]    # one per problem, ordered 0..N-1
    cross_cutting_hint: str             # shared archetype or empty string
```

### Failure Handling

- **Retries:** 2 (pydantic-ai level)
- **Validation:** `len(plan.problem_metas) != n` triggers the fallback immediately — the model did not produce the right number of entries
- **Fallback (`_default_plan`):** Returns a `PlannerOutput` with generic themes (`"Process automation"`, `"Predictive analytics"`, `"AI-powered decision support"`) for every problem; `cross_cutting_hint = ""`
- **Exception:** Any exception (network, schema, timeout) triggers the same fallback — the brainstorm pipeline always continues

### SSE Keepalive During Planning

The planner call takes 20–30 seconds. While it runs, the SSE generator polls with `asyncio.wait(..., timeout=7.0)` and emits rotating `status` events to prevent the browser from dropping the idle connection:

```
"Analysing your five challenges…"
"Identifying cross-cutting themes…"
"Mapping relationships between problems…"
"Calibrating agent instructions…"
"Almost ready to launch…"
```

---

## Agent 2 — BrainstormAgent

**File:** `backend/agents/brainstorm_agent.py`  
**Called by:** `run_problem()` inside `_stream()`, once per problem  
**Runs:** Five concurrent `asyncio.Task`s, each with a 90-second timeout

### Role

The BrainstormAgent receives one primary problem and all context produced by the PlannerAgent for that problem. It generates 3–5 distinct, commercially realistic AI use cases for the primary problem. It is instructed to:

- Be specific to the problem context — no generic AI descriptions
- Produce genuinely different approaches across the set (not variations of the same idea)
- Anchor all monetary estimates in euros (€)
- Scope every solution to be achievable within 12 months by a mid-sized organisation
- Flag, in the `also_addresses` field, any other workshop problems the solution meaningfully serves (without inflating this list)

### Prompt Construction (`_build_prompt`)

The prompt is assembled in ordered sections:

| Section | Condition | Content |
|---|---|---|
| Workshop context | `admin_prompt` is non-empty | The facilitator's system prompt (e.g. "Benjamin" persona) |
| Primary problem | always | The problem text, labelled `PRIMARY PROBLEM (Problem N)` |
| All problems | always | Numbered list of all 5 problems for cross-problem context |
| Key themes | `meta.key_themes` is set | Bullet list from the PlannerAgent |
| Related problems | `meta.similar_to` is non-empty | Named related problems; agents are instructed to generate cross-applicable solutions where appropriate |
| Combined framing | `meta.combined_statement` is set | Optional merged restatement from the PlannerAgent |
| Cross-cutting hint | `cross_cutting_hint` is non-empty | Shared archetype from the PlannerAgent |
| Generation instructions | always | Exact count, and all field-level constraints |

### Inputs

```python
async def analyse_problem(
    problem: str,            # the primary problem text
    problem_index: int,      # 0-based
    problem_id: str,         # DB UUID of the problems row
    session_id: str,
    system_prompt: str,      # admin-configured persona prompt
    all_problems: list[str], # all 5 problem texts
    planner_meta: ProblemMeta | None,   # from PlannerAgent
    cross_cutting_hint: str = "",       # from PlannerAgent
) -> list[dict]:
```

### Output Schema

```python
class UseCaseSchema(BaseModel):
    title: str                  # noun-phrase, max 8 words
    summary: str                # one sentence: solution + primary benefit
    description: str            # 3-5 sentences: what it does, how it works, why it fits
    how_it_works: list[str]     # 3-5 concrete implementation steps, each a full sentence
    data_required: str          # specific data sources and inputs
    time_to_implement: str      # e.g. "3-6 months for MVP, 12 months full rollout"
    complexity: Literal['Low', 'Medium', 'High']
    estimated_cost_roi: str     # must include € figures; e.g. "€60k–€120k; 2-3× ROI"
    also_addresses: list[int]   # 0-based indices of other problems genuinely addressed

class BrainstormOutput(BaseModel):
    use_cases: list[UseCaseSchema]
```

After the LLM call, the agent caps the list to `solution_count = max(3, min(5, meta.suggested_solution_count))` and filters `also_addresses` entries to only valid, non-primary indices.

### Failure Handling

- **Retries:** 3 (pydantic-ai level)
- **Per-task timeout:** 90 seconds, enforced with `asyncio.wait_for`
- **On timeout:** Emits `problem_error` SSE event for that problem index; the remaining tasks continue unaffected
- **On exception:** Same — `problem_error` SSE event; pipeline continues
- **Session failure gate:** If zero use cases are collected across all 5 tasks, the session is marked `failed` and a terminal `error` SSE event is emitted

---

## Agent 3 — PriorityAgent

**File:** `backend/agents/priority_agent.py`  
**Called by:** `_stream()` after all five BrainstormAgent tasks complete  
**Runs:** Once, as the final step before the session is marked `complete`

### Role

The PriorityAgent selects exactly 3 use cases from the full generated pool to designate as top priorities. It evaluates each use case on:

1. **Strategic business value** — direct impact on revenue, cost reduction, or risk mitigation
2. **Ease of implementation** — preference for Low and Medium complexity
3. **Cost efficiency** — lower build cost for comparable ROI is preferred
4. **Cross-problem reach** — `also_addresses` count is noted but used only as a signal, not a primary criterion

The constraint is that the 3 selected use cases must span **at least 2 different business problems** — preventing all three priorities from collapsing onto a single problem.

### Input

All generated use cases are passed as a listing with the fields most relevant to prioritisation:

```
ID=<uuid> | Problem N | Complexity=Low | <title> — <summary> | Cost/ROI: <estimated_cost_roi> | Also addresses: N other problem(s)
```

### Output Schema

```python
class PrioritySelection(BaseModel):
    slot_1: str     # UUID of the highest-priority use case
    slot_2: str     # UUID of the second-priority use case
    slot_3: str     # UUID of the third-priority use case
    reasoning: str  # 1-2 sentences explaining the selection
```

### Validation (before accepting LLM output)

All three conditions must pass; if any fails, the fallback runs immediately:

1. The three IDs are distinct
2. All three IDs exist in the generated set
3. The three IDs span at least 2 distinct `problem_index` values

### Failure Handling

- **Retries:** 2 (pydantic-ai level)
- **Fallback (`_fallback_priorities`):** Sorts all use cases by complexity (`Low` → `Medium` → `High`) and takes the first 3 unique entries. This is deterministic and guaranteed to succeed.
- **On exception:** Falls back to the same sort-by-complexity approach
- **Effect of priorities:** `ai_priority` and `user_priority` are both set to the slot number (1, 2, or 3) in the same DB transaction that marks the session `complete`. Users can subsequently override `user_priority` through voting without affecting `ai_priority`.

---

## Evaluation Harness

**Directory:** `backend/tests/eval/`  
**Entry point:** `python -m tests.eval.run --session SESSION_ID [--output PATH]`

The harness connects directly to the database, fetches a completed session, runs three parallel evaluation stages using independent LLM judges (same Azure OpenAI deployment), and writes a JSON report to `tests/eval/results/<session_id>.json`.

```bash
# Usage
cd backend
python -m tests.eval.run --session <uuid>
# Output: tests/eval/results/<uuid>.json
```

### Evaluation Stage 1 — Brainstorm Quality Scoring

**Judge:** `_brainstorm_judge` — `output_type: ProblemScoresOutput`  
**Granularity:** Once per problem (5 parallel judge calls)

Each use case is scored on four dimensions, each 0–3:

| Dimension | 0 | 1 | 2 | 3 |
|---|---|---|---|---|
| **Relevance** | Unrelated to the problem | Tangentially related | Addresses a real aspect | Directly and precisely solves the stated problem |
| **Specificity** | Generic AI buzzwords | Some context, mostly generic | Specific to the problem domain | Could only apply to this exact problem as described |
| **Feasibility** | Unrealistic timeline or cost | Plausible but optimistic | Realistic for most mid-sized orgs | Grounded and conservative; well-scoped for 12 months |
| **Diversity** | Near-identical to a sibling | Significant overlap with another | Distinct with minor overlap | Genuinely different angle from all siblings |

Diversity is scored relative to the other use cases in the same problem set — it is a set-level property, not an intrinsic property of the use case in isolation.

**Scoring is strict:** A 3 must be genuinely outstanding, not merely adequate.

**Aggregation:**

```
use_case.mean    = (relevance + specificity + feasibility + diversity) / 4
problem_mean     = mean of all use case means for that problem
session_mean     = mean of all problem_means (printed as "X.XX / 3.00")
```

The judge is prompted to match use cases back by title (lowercased), so title stability across the brainstorm run is important.

### Evaluation Stage 2 — Cross-Problem Precision

**Judge:** `_cross_problem_judge` — `output_type: CrossProblemVerdict`  
**Granularity:** Once per entry in any use case's `also_addresses` list (all run in parallel)

For each claim that a use case "also addresses" a secondary problem, the judge independently reads the primary problem, the secondary problem, and the use case (title + description), then returns one of:

| Verdict | Meaning |
|---|---|
| `justified` | The use case genuinely provides meaningful value for the secondary problem |
| `superficial` | The link is real but weak; benefit to the secondary problem is minor |
| `wrong` | The use case does not meaningfully address the secondary problem |

**Metric:**

```
precision = justified_count / total_also_addresses_entries
```

A high precision (close to 1.0) means the BrainstormAgent's cross-problem claims are well-calibrated. A low precision means the model is over-inflating `also_addresses` with weak or spurious links.

If no use case has any `also_addresses` entries, the stage returns `{ "precision": null }`.

On any individual judge failure, the entry is counted as `"wrong"` (conservative default).

### Evaluation Stage 3 — Priority Agreement

**Judge:** `_priority_judge` — `output_type: JudgePrioritySelection`  
**Granularity:** Once per session

An independent judge (using the same prioritisation criteria as the PriorityAgent, same instructions) selects its own top-3 use cases from the full pool and the result is compared against the agent's selection.

**Agreement levels:**

| Label | Condition |
|---|---|
| `full_agreement` | Judge and agent share all 3 IDs |
| `partial_agreement` | Judge and agent share exactly 2 IDs |
| `disagreement` | Judge and agent share 0 or 1 IDs |

The judge's `reasoning` field is included in the report for qualitative review. The agent's selection is derived from `ai_priority` values stored in the database (not `user_priority`, which may have been overridden by participants).

### Report Structure

```json
{
  "session_id": "...",
  "problems": ["problem 1 text", "...", "problem 5 text"],
  "brainstorm": {
    "per_problem": [
      {
        "problem_index": 0,
        "use_cases": [
          {
            "id": "...",
            "title": "...",
            "scores": {
              "relevance": 2,
              "specificity": 3,
              "feasibility": 2,
              "diversity": 2
            },
            "mean": 2.25
          }
        ],
        "problem_mean": 2.10
      }
    ],
    "session_mean": 2.18
  },
  "cross_problem": {
    "total_entries": 7,
    "justified": 5,
    "superficial": 1,
    "wrong": 1,
    "precision": 0.71
  },
  "priority_agent": {
    "evaluator_selection": ["uuid-a", "uuid-b", "uuid-c"],
    "agent_selection": ["uuid-a", "uuid-d", "uuid-c"],
    "agreement": "partial_agreement",
    "evaluator_reasoning": "..."
  },
  "overall_mean": 2.18
}
```

---

## Golden Test Sets

**Directory:** `backend/tests/golden/`

Three industry scenario files define problem sets that can be used as reproducible eval inputs. All three are currently stubs with `TODO` placeholders — real problem texts are pending:

| File | Scenario | Intent |
|---|---|---|
| `set_a_manufacturing.json` | Manufacturing operations | Supply chain, quality control, workforce scheduling, maintenance, inventory forecasting |
| `set_b_retail.json` | Retail / customer-facing | Churn, personalisation, support volume, onboarding drop-off, feedback analysis |
| `set_c_professional_services.json` | Professional services / cross-cutting | Deliberately broad and overlapping problems — stress-tests the PlannerAgent's grouping logic and the BrainstormAgent's specificity on harder inputs |

`baselines.json` records the reference `session_mean` and `cross_problem_precision` scores for each set (all currently `null`). Once problem texts are filled in and eval runs are completed, these baselines serve as regression guards — a future change that drops either metric below the recorded baseline warrants investigation.

---

## Agent Interaction Summary

```
PlannerAgent (1×)
  ├── Produces: ProblemMeta × 5, cross_cutting_hint
  └── Consumed by: all 5 BrainstormAgent calls

BrainstormAgent (5× concurrent)
  ├── Consumes: one problem text + its ProblemMeta + cross_cutting_hint + system_prompt
  ├── Produces: list[UseCaseSchema] (3–5 use cases per problem)
  └── Results persisted to use_cases table; SSE emits problem_done per task

PriorityAgent (1×)
  ├── Consumes: all generated use cases (flat list)
  ├── Produces: PrioritySelection (slot_1, slot_2, slot_3 UUIDs)
  └── Sets ai_priority + user_priority on 3 rows; session → 'complete'

Eval harness (offline, per completed session)
  ├── _brainstorm_judge (5× parallel)  → relevance / specificity / feasibility / diversity scores
  ├── _cross_problem_judge (N× parallel) → justified / superficial / wrong per also_addresses entry
  └── _priority_judge (1×) → independent top-3 selection vs. agent's selection → agreement label
```
