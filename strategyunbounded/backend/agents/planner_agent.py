import logging

from pydantic import BaseModel, Field
from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider
from openai import AsyncAzureOpenAI

from config import settings

logger = logging.getLogger(__name__)

_az_client = AsyncAzureOpenAI(
    api_key=settings.AZURE_OPENAI_API_KEY,
    azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
    api_version=settings.AZURE_OPENAI_API_VERSION,
)
_provider = OpenAIProvider(openai_client=_az_client)
_model = OpenAIChatModel(settings.AZURE_OPENAI_CHAT_DEPLOYMENT, provider=_provider)


class ProblemMeta(BaseModel):
    index: int = Field(ge=0, description="Problem index (0-based)")
    similar_to: list[int] = Field(
        default_factory=list,
        description="Indices of other problems with overlapping themes"
    )
    key_themes: list[str] = Field(
        description="2-4 key AI solution themes to explore for this problem"
    )
    suggested_solution_count: int = Field(
        default=3,
        description="3 (default) or 4-5 for genuinely multi-dimensional problems"
    )
    combined_statement: str | None = Field(
        default=None,
        description="Optional restatement merging this problem with related ones"
    )


class PlannerOutput(BaseModel):
    problem_metas: list[ProblemMeta] = Field(
        description="One entry per problem, ordered by index 0 to N-1"
    )
    cross_cutting_hint: str = Field(
        default="",
        description="A solution archetype likely to address 2+ problems; empty string if none"
    )


_agent = Agent(
    model=_model,
    output_type=PlannerOutput,
    instructions=(
        "You are a senior AI strategy consultant planning a brainstorming session. "
        "You do not generate solutions — you analyse the problem landscape and create "
        "an optimal research plan for brainstorming agents. Be concise and specific."
    ),
    retries=2,
)


def _default_plan(n: int) -> PlannerOutput:
    return PlannerOutput(
        problem_metas=[
            ProblemMeta(
                index=i,
                key_themes=["Process automation", "Predictive analytics", "AI-powered decision support"],
            )
            for i in range(n)
        ],
        cross_cutting_hint="",
    )


async def plan_brainstorm(problems: list[str]) -> PlannerOutput:
    n = len(problems)
    numbered = "\n".join(f"{i + 1}. {p}" for i, p in enumerate(problems))
    logger.info("[PLANNER] Starting — %d problems", n)
    try:
        result = await _agent.run(
            f"Here are {n} business problems submitted for an AI use case workshop:\n\n"
            f"{numbered}\n\n"
            "For each problem, provide:\n"
            "1. similar_to: list of other problem indices (0-based) with overlapping themes\n"
            "2. key_themes: 2-4 specific AI solution themes to explore\n"
            "3. suggested_solution_count: 3 (default) or 4-5 only for multi-dimensional problems\n"
            "4. combined_statement: optional restatement if closely related to another problem\n\n"
            "Also write a cross_cutting_hint if one AI solution archetype could span 2+ problems.\n\n"
            f"Return exactly {n} problem_metas ordered by index 0 to {n - 1}."
        )
        plan: PlannerOutput = result.output
        if len(plan.problem_metas) != n:
            logger.warning("[PLANNER] Returned %d metas, expected %d — using default plan", len(plan.problem_metas), n)
            return _default_plan(n)
        logger.info("[PLANNER] OK — cross_cutting_hint: %r", plan.cross_cutting_hint[:80] if plan.cross_cutting_hint else "")
        return plan
    except Exception as exc:
        logger.error("[PLANNER] FAILED (%s: %s) — using default plan", type(exc).__name__, exc)
        return _default_plan(n)
