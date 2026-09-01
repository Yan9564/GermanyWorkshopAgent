import json
import uuid
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel

from database import get_db, get_pool
from agents.discussion_agent import analyse_discussion, UseCaseSummary
from agents.representation_agent import generate_representation

logger = logging.getLogger(__name__)
router = APIRouter()


class DiscussionAnalysisRequest(BaseModel):
    pass


class GenerateStage2Request(BaseModel):
    use_case_id: str


class AnnotationRequest(BaseModel):
    stage2_id: str
    element_key: str
    comment: str


def _uc_row_to_summary(row) -> UseCaseSummary:
    return UseCaseSummary(
        id=row["id"],
        title=row["title"],
        summary=row["summary"],
        problem_index=row["problem_index"],
    )


def _uc_row_to_dict(row) -> dict:
    return {
        "id": row["id"],
        "title": row["title"],
        "summary": row["summary"],
        "description": row["description"],
        "how_it_works": list(row["how_it_works"]),
        "data_required": row["data_required"],
        "complexity": row["complexity"],
        "estimated_cost_roi": row["estimated_cost_roi"],
        "problem_index": row["problem_index"],
    }


@router.post("/sessions/{session_id}/stage2/discussion-analysis")
async def analyse_session_discussion(session_id: str, conn=Depends(get_db)):
    session = await conn.fetchrow("SELECT id FROM sessions WHERE id = $1", session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    entries = await conn.fetch(
        "SELECT transcript FROM discussion_entries WHERE session_id = $1 ORDER BY recorded_at",
        session_id,
    )
    transcript = "\n\n".join(r["transcript"] for r in entries)

    priority_ucs = await conn.fetch(
        """
        SELECT id, title, summary, problem_index
        FROM use_cases
        WHERE session_id = $1 AND ai_priority IS NOT NULL
        ORDER BY ai_priority
        """,
        session_id,
    )
    if not priority_ucs:
        raise HTTPException(status_code=400, detail="No priority use cases found for this session")

    summaries = [_uc_row_to_summary(r) for r in priority_ucs]
    result = await analyse_discussion(transcript, summaries)

    return {
        "recommended_use_case_id": result.recommended_use_case_id,
        "confidence": result.confidence,
        "reasoning": result.reasoning,
        "key_themes": result.key_themes,
    }


async def _run_stage2_generation(session_id: str, stage2_id: str, use_case_id: str):
    pool = get_pool()
    async with pool.acquire() as conn:
        try:
            # Fetch discussion transcript
            entries = await conn.fetch(
                "SELECT transcript FROM discussion_entries WHERE session_id = $1 ORDER BY recorded_at",
                session_id,
            )
            transcript = "\n\n".join(r["transcript"] for r in entries)

            # Fetch priority use cases for discussion analysis
            priority_ucs = await conn.fetch(
                """
                SELECT id, title, summary, problem_index
                FROM use_cases
                WHERE session_id = $1 AND ai_priority IS NOT NULL
                ORDER BY ai_priority
                """,
                session_id,
            )
            summaries = [_uc_row_to_summary(r) for r in priority_ucs]
            discussion_result = await analyse_discussion(transcript, summaries)

            # Fetch selected use case details
            uc_row = await conn.fetchrow(
                """
                SELECT id, title, summary, description, how_it_works,
                       data_required, complexity, estimated_cost_roi, problem_index
                FROM use_cases WHERE id = $1
                """,
                use_case_id,
            )
            if not uc_row:
                raise ValueError(f"Use case {use_case_id} not found")

            # Fetch problem texts
            problems = await conn.fetch(
                "SELECT text FROM problems WHERE session_id = $1 ORDER BY idx",
                session_id,
            )
            problem_texts = [r["text"] for r in problems]

            rep = await generate_representation(
                use_case=_uc_row_to_dict(uc_row),
                problems=problem_texts,
                discussion_themes=discussion_result.key_themes,
            )

            payload = rep.model_dump(mode="json")

            await conn.execute(
                """
                UPDATE stage2_results
                SET status = 'complete',
                    discussion_reasoning = $1,
                    recommended_use_case_id = $2,
                    representation_type = $3,
                    representation_payload = $4
                WHERE id = $5
                """,
                discussion_result.reasoning,
                discussion_result.recommended_use_case_id,
                rep.primary_type,
                json.dumps(payload),
                stage2_id,
            )
            logger.info("[STAGE2] Generation complete for session %s", session_id)

        except Exception as exc:
            logger.error("[STAGE2] Generation failed for session %s: %s", session_id, exc)
            await conn.execute(
                "UPDATE stage2_results SET status = 'failed' WHERE id = $1",
                stage2_id,
            )


@router.post("/sessions/{session_id}/stage2/generate")
async def generate_stage2(
    session_id: str,
    body: GenerateStage2Request,
    background_tasks: BackgroundTasks,
    conn=Depends(get_db),
):
    session = await conn.fetchrow("SELECT id FROM sessions WHERE id = $1", session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    uc = await conn.fetchrow(
        "SELECT id FROM use_cases WHERE id = $1 AND session_id = $2",
        body.use_case_id,
        session_id,
    )
    if not uc:
        raise HTTPException(status_code=404, detail="Use case not found in this session")

    # Upsert: delete any existing stage2 row for this session, then insert fresh
    await conn.execute("DELETE FROM stage2_results WHERE session_id = $1", session_id)

    stage2_id = str(uuid.uuid4())
    await conn.execute(
        """
        INSERT INTO stage2_results (id, session_id, use_case_id, status)
        VALUES ($1, $2, $3, 'generating')
        """,
        stage2_id,
        session_id,
        body.use_case_id,
    )

    background_tasks.add_task(_run_stage2_generation, session_id, stage2_id, body.use_case_id)

    return {"stage2_id": stage2_id, "status": "generating"}


@router.get("/sessions/{session_id}/stage2")
async def get_stage2(session_id: str, conn=Depends(get_db)):
    row = await conn.fetchrow(
        """
        SELECT id, status, use_case_id, recommended_use_case_id,
               discussion_reasoning, representation_type, representation_payload
        FROM stage2_results
        WHERE session_id = $1
        ORDER BY created_at DESC
        LIMIT 1
        """,
        session_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="No Stage 2 result for this session")

    payload = None
    if row["representation_payload"]:
        raw = row["representation_payload"]
        payload = json.loads(raw) if isinstance(raw, str) else raw

    return {
        "stage2_id": row["id"],
        "status": row["status"],
        "use_case_id": row["use_case_id"],
        "recommended_use_case_id": row["recommended_use_case_id"],
        "discussion_reasoning": row["discussion_reasoning"],
        "representation_type": row["representation_type"],
        "representation": payload,
    }


@router.post("/sessions/{session_id}/stage2/annotations")
async def add_annotation(
    session_id: str,
    body: AnnotationRequest,
    conn=Depends(get_db),
):
    stage2 = await conn.fetchrow(
        "SELECT id FROM stage2_results WHERE id = $1 AND session_id = $2",
        body.stage2_id,
        session_id,
    )
    if not stage2:
        raise HTTPException(status_code=404, detail="Stage 2 result not found")

    annotation_id = str(uuid.uuid4())
    await conn.execute(
        """
        INSERT INTO stage2_annotations (id, stage2_id, element_key, comment)
        VALUES ($1, $2, $3, $4)
        """,
        annotation_id,
        body.stage2_id,
        body.element_key,
        body.comment,
    )
    return {"id": annotation_id}


@router.get("/sessions/{session_id}/stage2/annotations")
async def get_annotations(session_id: str, conn=Depends(get_db)):
    stage2 = await conn.fetchrow(
        "SELECT id FROM stage2_results WHERE session_id = $1 ORDER BY created_at DESC LIMIT 1",
        session_id,
    )
    if not stage2:
        return {"annotations": []}

    rows = await conn.fetch(
        """
        SELECT id, element_key, comment, created_at
        FROM stage2_annotations
        WHERE stage2_id = $1
        ORDER BY created_at
        """,
        stage2["id"],
    )
    return {
        "annotations": [
            {
                "id": r["id"],
                "element_key": r["element_key"],
                "comment": r["comment"],
                "created_at": r["created_at"].isoformat(),
            }
            for r in rows
        ]
    }
