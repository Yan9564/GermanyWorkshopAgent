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

RepType = Literal["journey_map", "dashboard", "impact_canvas", "pipeline"]


# --- Journey Map ---

class JourneyStep(BaseModel):
    label: str
    description: str
    time_estimate: str | None = None
    is_ai_powered: bool = False


class JourneyMapData(BaseModel):
    persona: str
    current_steps: list[JourneyStep]
    future_steps: list[JourneyStep]
    pain_points: list[str]
    gains: list[str]


# --- Dashboard ---

class KPICard(BaseModel):
    label: str
    value: str
    trend: str | None = None
    unit: str | None = None


class ChartSpec(BaseModel):
    chart_type: Literal["bar", "line", "pie", "area", "table"]
    title: str
    description: str
    sample_data: list[dict]


class DashboardData(BaseModel):
    title: str
    subtitle: str
    kpi_cards: list[KPICard]
    charts: list[ChartSpec]


# --- Impact Canvas ---

class DataRequirement(BaseModel):
    source: str
    type: str
    availability: Literal["available", "needs_work", "missing"]


class Metric(BaseModel):
    name: str
    baseline: str
    target: str
    timeframe: str


class ROIModel(BaseModel):
    investment_range: str
    annual_benefit: str
    payback_period: str


class Risk(BaseModel):
    description: str
    severity: Literal["Low", "Medium", "High"]
    mitigation: str


class ImpactCanvasData(BaseModel):
    problem_statement: str
    solution_overview: str
    data_required: list[DataRequirement]
    key_metrics: list[Metric]
    estimated_roi: ROIModel
    top_risks: list[Risk]


# --- Pipeline ---

class PipelineNode(BaseModel):
    id: str
    label: str
    type: Literal["source", "ingest", "transform", "model", "output", "consumer"]
    description: str


class PipelineEdge(BaseModel):
    from_id: str
    to_id: str
    label: str | None = None


class PipelineData(BaseModel):
    nodes: list[PipelineNode]
    edges: list[PipelineEdge]


# --- Top-level output ---

class RepresentationOutput(BaseModel):
    primary_type: RepType = Field(
        description="The most fitting representation type for this use case"
    )
    secondary_types: list[RepType] = Field(
        description="1-2 other representation types to offer as secondary tabs",
        default_factory=list,
    )
    journey_map: JourneyMapData | None = None
    dashboard: DashboardData | None = None
    impact_canvas: ImpactCanvasData | None = None
    pipeline: PipelineData | None = None
    narration_script: str = Field(
        description="2-4 sentences Benjamin will speak aloud to introduce this representation"
    )


_agent = Agent(
    model=_model,
    output_type=RepresentationOutput,
    instructions=(
        "You are an AI strategy consultant generating a visual representation of an AI use case "
        "for a business workshop. Choose the MOST appropriate primary representation type:\n"
        "- journey_map: best for process-transformation use cases (automation, workflow changes)\n"
        "- dashboard: best for monitoring/analytics use cases with clear KPIs and charts\n"
        "- impact_canvas: best for ROI-heavy or strategic use cases\n"
        "- pipeline: best for data-engineering or ML pipeline use cases\n\n"
        "Generate FULL content for the primary type. "
        "Generate LIGHTER content (fewer items) for 1-2 secondary types. "
        "Set all other type fields to null. "
        "All monetary estimates must be in euros (€). "
        "Sample data in charts must be realistic and context-specific — not generic placeholders."
    ),
    retries=2,
)


async def generate_representation(
    use_case: dict,
    problems: list[str],
    discussion_themes: list[str],
) -> RepresentationOutput:
    themes_text = (
        "\n".join(f"- {t}" for t in discussion_themes)
        if discussion_themes
        else "No discussion themes recorded."
    )
    problems_text = "\n".join(f"{i + 1}. {p}" for i, p in enumerate(problems))

    prompt = (
        f"USE CASE TO REPRESENT:\n"
        f"Title: {use_case['title']}\n"
        f"Summary: {use_case['summary']}\n"
        f"Description: {use_case['description']}\n"
        f"How it works: {chr(10).join(use_case.get('how_it_works', []))}\n"
        f"Data required: {use_case['data_required']}\n"
        f"Complexity: {use_case['complexity']}\n"
        f"Estimated cost/ROI: {use_case['estimated_cost_roi']}\n\n"
        f"ORIGINAL BUSINESS PROBLEMS:\n{problems_text}\n\n"
        f"KEY THEMES FROM GROUP DISCUSSION:\n{themes_text}\n\n"
        "Generate a tailored visual representation. "
        "Choose the primary type that best suits this use case's nature. "
        "Ensure all content is specific to this organisation's context — no generic examples."
    )

    logger.info("[REPRESENTATION] Generating for use case: %s", use_case.get("title", "?"))
    try:
        result = await _agent.run(prompt)
        output: RepresentationOutput = result.output
        logger.info(
            "[REPRESENTATION] Done — primary_type=%s secondary=%s",
            output.primary_type,
            output.secondary_types,
        )
        return output
    except Exception as exc:
        logger.error("[REPRESENTATION] Agent failed: %s", exc)
        raise
