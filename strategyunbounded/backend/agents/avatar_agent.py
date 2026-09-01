from typing import Any

STAGE_GUIDANCE: dict[str, dict[str, str]] = {
    "intro": {
        "message": (
            "Welcome to Strategy Unbounded. Watch the introduction, then click "
            "'Begin the Activity' when you're ready to start identifying your "
            "organisation's biggest challenges."
        ),
        "nextStep": "Click 'Begin the Activity' to continue.",
    },
    "problem_input_empty": {
        "message": (
            "Think about real problems your organisation faces — inefficiencies, "
            "risks, missed opportunities, or bottlenecks. Be specific: the more "
            "concrete your description, the better the AI solutions will be."
        ),
        "nextStep": "Describe your first business challenge in the text field.",
    },
    "problem_input_partial": {
        "message": (
            "Good progress. Keep going — the AI will brainstorm solutions for each "
            "problem independently. Try to cover different areas of your business "
            "across your 5 problems."
        ),
        "nextStep": "Fill in the remaining problem fields.",
    },
    "problem_input_ready": {
        "message": (
            "All 5 problems submitted. Review them before generating — once you "
            "click 'Generate Use Cases' the AI agents will start working in parallel "
            "and the process cannot be paused."
        ),
        "nextStep": "Click 'Generate Use Cases' when ready.",
    },
    "processing": {
        "message": (
            "Our AI agents are analysing each of your challenges in parallel. "
            "They will generate AI-powered solutions per problem, then rank "
            "the top 3 priorities across all ideas."
        ),
        "nextStep": "Sit tight — results will appear automatically.",
    },
    "results_overview": {
        "message": (
            "You have AI use cases across your 5 problems. The top 3 are "
            "pre-ranked by the AI based on business value, ease of implementation, "
            "and cost efficiency. Click any card to see full details."
        ),
        "nextStep": "Click a card to explore it in detail.",
    },
    "results_with_votes": {
        "message": (
            "You have re-ranked some priorities. Use the vote controls to adjust "
            "further. Use the feedback buttons on cards to flag ideas worth exploring "
            "or deprioritising. Download the PPT to share results with your team."
        ),
        "nextStep": "Download the PowerPoint when you are done prioritising.",
    },
    "card_detail": {
        "message": (
            "This card shows the full AI use case: how it works step by step, "
            "what data it needs, implementation time, complexity, and estimated "
            "cost and ROI in euros. Use this to assess feasibility."
        ),
        "nextStep": "Use the feedback buttons to flag this idea.",
    },
    "card_detail_with_feedback": {
        "message": (
            "Feedback recorded. Your ratings help prioritise which ideas to take "
            "forward into Phase 2, where the top solutions will be researched in "
            "much greater depth."
        ),
        "nextStep": "Close this card and explore more use cases.",
    },
    "discussion": {
        "message": (
            "Time for a group conversation. Each person records their view on which "
            "AI use case the team should take forward. The AI will listen to everyone "
            "and recommend the top choice."
        ),
        "nextStep": "Record your contribution, then click Finish Discussion.",
    },
    "confirm_use_case": {
        "message": (
            "Based on your group discussion, I've identified the use case your team "
            "converged on. Review my reasoning, then confirm or choose a different one."
        ),
        "nextStep": "Click 'Yes, use this' to generate your representation.",
    },
    "stage2_generating": {
        "message": (
            "I'm building a tailored visual representation of your selected use case — "
            "showing exactly how it would look in practice, what data it needs, and "
            "how it solves your challenges."
        ),
        "nextStep": "This takes about 20–30 seconds.",
    },
    "stage2_view": {
        "message": (
            "Here's your representation. The primary view was chosen to best fit this "
            "use case. Use the tabs to explore other perspectives, and the annotation "
            "tool to mark up any comments."
        ),
        "nextStep": "Click the pencil icon to start annotating.",
    },
    "stage2_annotating": {
        "message": (
            "Annotation mode is active. Click any element in the view to add a comment. "
            "Your annotations will be included in the export."
        ),
        "nextStep": "Click the pencil icon again to exit annotation mode.",
    },
}


async def get_guidance(stage: str, context: dict[str, Any] | None) -> dict[str, str]:
    return STAGE_GUIDANCE.get(
        stage,
        {
            "message": "Keep going — you are doing great.",
            "nextStep": "Continue with the workshop.",
        },
    )
