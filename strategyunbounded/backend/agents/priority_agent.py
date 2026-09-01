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


class PrioritySelection(BaseModel):
    slot_1: str = Field(description="ID of the highest-priority use case")
    slot_2: str = Field(description="ID of the second-priority use case")
    slot_3: str = Field(description="ID of the third-priority use case")
    reasoning: str = Field(description="1-2 sentences explaining why these 3 were selected")


_agent = Agent(
    model=_model,
    output_type=PrioritySelection,
    instructions=(
        "You are an AI strategy consultant selecting the top 3 AI use cases from a workshop. "
        "Evaluate each on: (1) strategic business value, "
        "(2) ease of implementation — prefer Low and Medium complexity, "
        "(3) cost efficiency — lower build cost for similar ROI is better. "
        "The 3 selected use cases must span at least 2 different business problems."
    ),
    retries=2,
)


def _fallback_priorities(use_cases: list[dict]) -> dict[str, str]:
    complexity_order = {"Low": 0, "Medium": 1, "High": 2}
    sorted_ucs = sorted(use_cases, key=lambda u: complexity_order.get(u["complexity"], 1))
    selected: list[dict] = []
    seen_ids: set[str] = set()
    for uc in sorted_ucs:
        if len(selected) == 3:
            break
        if uc["id"] not in seen_ids:
            selected.append(uc)
            seen_ids.add(uc["id"])
    return {str(i + 1): uc["id"] for i, uc in enumerate(selected)}


async def nominate_priorities(all_use_cases: list[dict]) -> dict[str, str]:
    logger.info("[PRIORITY] Starting — %d total use cases", len(all_use_cases))
    if len(all_use_cases) < 3:
        logger.warning("[PRIORITY] Fewer than 3 use cases — returning all as priorities")
        return {str(i + 1): uc["id"] for i, uc in enumerate(all_use_cases)}

    listing = "\n".join(
        f"ID={uc['id']} | Problem {uc['problem_index'] + 1} | "
        f"Complexity={uc['complexity']} | {uc['title']} — {uc['summary']} | "
        f"Cost/ROI: {uc['estimated_cost_roi']} | "
        f"Also addresses: {len(uc.get('also_addresses', []))} other problem(s)"
        for uc in all_use_cases
    )

    valid_ids = {uc["id"] for uc in all_use_cases}
    problem_index_by_id = {uc["id"]: uc["problem_index"] for uc in all_use_cases}

    try:
        logger.info("[PRIORITY] Calling LLM to select top 3")
        result = await _agent.run(
            f"Here are all {len(all_use_cases)} AI use cases from this workshop:\n\n"
            f"{listing}\n\n"
            "Select exactly 3 use cases as the top priorities. "
            "Return the exact IDs shown above (the UUID strings after 'ID=')."
        )
        sel: PrioritySelection = result.output
        chosen = [sel.slot_1, sel.slot_2, sel.slot_3]

        if (
            len(set(chosen)) == 3
            and all(cid in valid_ids for cid in chosen)
            and len({problem_index_by_id[cid] for cid in chosen}) >= 2
        ):
            logger.info("[PRIORITY] OK — slots: 1=%s 2=%s 3=%s | reasoning: %s", sel.slot_1[:8], sel.slot_2[:8], sel.slot_3[:8], sel.reasoning[:80])
            return {"1": sel.slot_1, "2": sel.slot_2, "3": sel.slot_3}
        logger.warning("[PRIORITY] LLM output failed validation — using fallback. chosen=%s", chosen)
    except Exception as exc:
        logger.error("[PRIORITY] LLM call failed (%s: %s) — using fallback", type(exc).__name__, exc)

    result = _fallback_priorities(all_use_cases)
    logger.info("[PRIORITY] Fallback priorities: %s", result)
    return result
