import logging
from typing import Literal

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


class UseCaseSummary(BaseModel):
    id: str
    title: str
    summary: str
    problem_index: int


class DiscussionAnalysisOutput(BaseModel):
    recommended_use_case_id: str = Field(
        description="The ID of the use case the group most converged on"
    )
    confidence: Literal["high", "medium", "low"] = Field(
        description="How clearly the transcript points to one use case"
    )
    reasoning: str = Field(
        description="2-3 sentences explaining why this use case was selected based on what was said"
    )
    key_themes: list[str] = Field(
        description="2-4 short phrases capturing what the group cared about most",
        default_factory=list,
    )


_agent = Agent(
    model=_model,
    output_type=DiscussionAnalysisOutput,
    instructions=(
        "You are analysing a group discussion transcript from a business AI workshop. "
        "The group has reviewed several AI use cases and is deciding which one to take forward. "
        "Identify which use case the group converged on based on the language, enthusiasm, "
        "and frequency of mentions. Return the exact ID string from the provided list."
    ),
    retries=2,
)


async def analyse_discussion(
    transcript: str,
    use_cases: list[UseCaseSummary],
) -> DiscussionAnalysisOutput:
    valid_ids = {uc.id for uc in use_cases}

    if not transcript.strip():
        logger.warning("[DISCUSSION] Empty transcript — defaulting to first use case")
        fallback_id = use_cases[0].id if use_cases else ""
        return DiscussionAnalysisOutput(
            recommended_use_case_id=fallback_id,
            confidence="low",
            reasoning="No discussion transcript was provided. Defaulting to the top AI-ranked use case.",
            key_themes=[],
        )

    use_case_list = "\n".join(
        f"ID={uc.id} | Problem {uc.problem_index + 1} | {uc.title} — {uc.summary}"
        for uc in use_cases
    )

    try:
        result = await _agent.run(
            f"DISCUSSION TRANSCRIPT:\n{transcript}\n\n"
            f"USE CASES UNDER CONSIDERATION:\n{use_case_list}\n\n"
            "Which use case did the group most want to take forward? "
            "Return the exact ID from the list above."
        )
        output: DiscussionAnalysisOutput = result.output

        if output.recommended_use_case_id not in valid_ids:
            logger.warning(
                "[DISCUSSION] LLM returned invalid ID %s — falling back to first use case",
                output.recommended_use_case_id,
            )
            output.recommended_use_case_id = use_cases[0].id
            output.confidence = "low"

        logger.info(
            "[DISCUSSION] Recommended: %s (confidence=%s)",
            output.recommended_use_case_id[:8],
            output.confidence,
        )
        return output

    except Exception as exc:
        logger.error("[DISCUSSION] Agent failed (%s) — falling back", exc)
        return DiscussionAnalysisOutput(
            recommended_use_case_id=use_cases[0].id if use_cases else "",
            confidence="low",
            reasoning="Analysis failed. Defaulting to the top AI-ranked use case.",
            key_themes=[],
        )
