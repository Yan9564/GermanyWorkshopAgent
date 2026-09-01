import logging
import uuid
from typing import Literal

from pydantic import BaseModel, Field
from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider
from openai import AsyncAzureOpenAI

from config import settings
from agents.planner_agent import ProblemMeta

logger = logging.getLogger(__name__)

_az_client = AsyncAzureOpenAI(
    api_key=settings.AZURE_OPENAI_API_KEY,
    azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
    api_version=settings.AZURE_OPENAI_API_VERSION,
)
_provider = OpenAIProvider(openai_client=_az_client)
_model = OpenAIChatModel(settings.AZURE_OPENAI_CHAT_DEPLOYMENT, provider=_provider)


class UseCaseSchema(BaseModel):
    title: str = Field(description="Solution name, noun-phrase format, max 8 words")
    summary: str = Field(description="One sentence describing the solution and its primary benefit")
    description: str = Field(
        description="3-5 sentences: what the solution does, how it works at a high level, "
                    "and why it suits this organisation's context"
    )
    how_it_works: list[str] = Field(
        description="3 to 5 concrete implementation steps, each a complete sentence"
    )
    data_required: str = Field(description="Specific data sources and inputs the solution needs")
    time_to_implement: str = Field(
        description="Realistic timeline, e.g. '3-6 months for MVP, 12 months full rollout'"
    )
    complexity: Literal['Low', 'Medium', 'High']
    estimated_cost_roi: str = Field(
        description="Build cost in euros (€) and expected ROI, "
                    "e.g. '€60k–€120k build cost; 2-3× ROI within 18 months'"
    )
    also_addresses: list[int] = Field(
        default_factory=list,
        description=(
            "Indices (0-based, 0 to 4) of OTHER problems (not the primary one) "
            "that this solution also meaningfully addresses. Leave empty if the "
            "solution only addresses the primary problem. Do not inflate this list — "
            "only include problems where the solution provides genuine value."
        ),
    )


class BrainstormOutput(BaseModel):
    use_cases: list[UseCaseSchema] = Field(
        description="The AI use cases generated for the primary problem"
    )


_agent = Agent(
    model=_model,
    output_type=BrainstormOutput,
    instructions=(
        "You are an expert AI strategy consultant generating practical, commercially realistic "
        "AI use cases for a business innovation workshop. "
        "Be specific to the problem context — avoid generic descriptions. "
        "All cost estimates must be in euros (€). "
        "Every solution must be achievable within 12 months by a mid-sized organisation."
    ),
    retries=3,
)


def _build_prompt(
    problem: str,
    problem_index: int,
    all_problems: list[str],
    meta: ProblemMeta,
    cross_cutting_hint: str,
    admin_prompt: str,
    solution_count: int,
) -> str:
    parts: list[str] = []

    if admin_prompt.strip():
        parts.append(f"WORKSHOP CONTEXT:\n{admin_prompt.strip()}\n")

    parts.append(f"PRIMARY PROBLEM (Problem {problem_index + 1}):\n{problem}\n")

    all_text = "\n".join(f"{i + 1}. {p}" for i, p in enumerate(all_problems))
    parts.append(
        f"ALL WORKSHOP PROBLEMS (context only — solutions must target the PRIMARY PROBLEM):\n"
        f"{all_text}\n"
    )

    if meta.key_themes:
        themes = "\n".join(f"- {t}" for t in meta.key_themes)
        parts.append(f"KEY THEMES TO EXPLORE:\n{themes}\n")

    if meta.similar_to:
        related = ", ".join(f"Problem {idx + 1}" for idx in meta.similar_to)
        parts.append(
            f"RELATED PROBLEMS: {related} share overlapping themes. "
            "Generate solutions that could serve both where appropriate, "
            "but keep the primary anchor on the PRIMARY PROBLEM.\n"
        )

    if meta.combined_statement:
        parts.append(f"COMBINED FRAMING: {meta.combined_statement}\n")

    if cross_cutting_hint:
        parts.append(f"CROSS-CUTTING HINT: {cross_cutting_hint}\n")

    parts.append(
        f"Generate exactly {solution_count} distinct AI use cases for the PRIMARY PROBLEM.\n"
        "Requirements for each use case:\n"
        "- Solves a concrete aspect of the problem (no vanity AI)\n"
        "- Specific to the problem context, not generic\n"
        "- A genuinely different approach from the other use cases\n"
        "- complexity must be exactly 'Low', 'Medium', or 'High'\n"
        "- estimated_cost_roi must include € figures\n"
        "- how_it_works must contain 3-5 steps, each a full sentence\n"
        "- If this solution meaningfully addresses any other workshop problem (not the primary one), list their 0-based indices in also_addresses. Leave it empty if the solution is specific to the primary problem only."
    )

    return "\n".join(parts)


async def analyse_problem(
    problem: str,
    problem_index: int,
    problem_id: str,
    session_id: str,
    system_prompt: str,
    all_problems: list[str] | None = None,
    planner_meta: ProblemMeta | None = None,
    cross_cutting_hint: str = "",
) -> list[dict]:
    if all_problems is None:
        all_problems = [problem]
    if planner_meta is None:
        planner_meta = ProblemMeta(
            index=problem_index,
            key_themes=["Process automation", "Predictive analytics", "AI-powered decision support"],
        )

    solution_count = max(3, min(5, planner_meta.suggested_solution_count))
    user_message = _build_prompt(
        problem=problem,
        problem_index=problem_index,
        all_problems=all_problems,
        meta=planner_meta,
        cross_cutting_hint=cross_cutting_hint,
        admin_prompt=system_prompt,
        solution_count=solution_count,
    )

    logger.info("[BRAINSTORM] Problem %d: calling LLM (deployment=%s)", problem_index, settings.AZURE_OPENAI_CHAT_DEPLOYMENT)
    result = await _agent.run(user_message)
    output: BrainstormOutput = result.output
    logger.info("[BRAINSTORM] Problem %d: LLM returned %d use cases", problem_index, len(output.use_cases))

    return [
        {
            "id": str(uuid.uuid4()),
            "session_id": session_id,
            "problem_id": problem_id,
            "problem_index": problem_index,
            "title": uc.title,
            "summary": uc.summary,
            "description": uc.description,
            "how_it_works": list(uc.how_it_works),
            "data_required": uc.data_required,
            "time_to_implement": uc.time_to_implement,
            "complexity": uc.complexity,
            "estimated_cost_roi": uc.estimated_cost_roi,
            "also_addresses": [
                idx for idx in uc.also_addresses
                if 0 <= idx < len(all_problems) and idx != problem_index
            ],
            "ai_priority": None,
            "user_priority": None,
            "feedback": None,
        }
        for uc in output.use_cases[:solution_count]
    ]
