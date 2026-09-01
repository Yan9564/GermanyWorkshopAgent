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

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from config import settings  # noqa: E402

_az_client = AsyncAzureOpenAI(
    api_key=settings.AZURE_OPENAI_API_KEY,
    azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
    api_version=settings.AZURE_OPENAI_API_VERSION,
)
_provider = OpenAIProvider(openai_client=_az_client)
_model = OpenAIChatModel(settings.AZURE_OPENAI_CHAT_DEPLOYMENT, provider=_provider)


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


async def score_brainstorm(problems: list[dict], use_cases: list[dict]) -> list[dict]:
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
    return list(await asyncio.gather(*tasks))


async def check_cross_problem(problems: list[dict], use_cases: list[dict]) -> dict:
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

    verdicts = list(await asyncio.gather(*[check_entry(e) for e in entries]))
    counts: dict[str, int] = {"justified": 0, "superficial": 0, "wrong": 0}
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
