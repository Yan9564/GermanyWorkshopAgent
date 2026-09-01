from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator

from database import get_db

router = APIRouter()


class VoteRequest(BaseModel):
    priority: Optional[int] = None

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v):
        if v is not None and v not in (1, 2, 3):
            raise ValueError("priority must be 1, 2, or 3")
        return v


class FeedbackRequest(BaseModel):
    feedback: Optional[str] = None

    @field_validator("feedback")
    @classmethod
    def validate_feedback(cls, v):
        if v is not None and v not in ("up", "down"):
            raise ValueError("feedback must be 'up' or 'down'")
        return v


@router.patch("/sessions/{session_id}/use-cases/{use_case_id}/vote")
async def vote(session_id: str, use_case_id: str, body: VoteRequest, conn=Depends(get_db)):
    exists = await conn.fetchval(
        "SELECT id FROM use_cases WHERE id = $1 AND session_id = $2",
        use_case_id,
        session_id,
    )
    if not exists:
        raise HTTPException(status_code=404, detail="Use case not found in this session")

    displaced: Optional[str] = None

    async with conn.transaction():
        if body.priority is not None:
            displaced_row = await conn.fetchrow(
                """
                UPDATE use_cases
                SET user_priority = NULL
                WHERE session_id = $1 AND user_priority = $2 AND id != $3
                RETURNING id
                """,
                session_id,
                body.priority,
                use_case_id,
            )
            if displaced_row:
                displaced = displaced_row["id"]

        await conn.execute(
            "UPDATE use_cases SET user_priority = $1 WHERE id = $2 AND session_id = $3",
            body.priority,
            use_case_id,
            session_id,
        )

    return {"useCaseId": use_case_id, "userPriority": body.priority, "displaced": displaced}


@router.patch("/sessions/{session_id}/use-cases/{use_case_id}/feedback")
async def feedback(session_id: str, use_case_id: str, body: FeedbackRequest, conn=Depends(get_db)):
    exists = await conn.fetchval(
        "SELECT id FROM use_cases WHERE id = $1 AND session_id = $2",
        use_case_id,
        session_id,
    )
    if not exists:
        raise HTTPException(status_code=404, detail="Use case not found in this session")

    row = await conn.fetchrow(
        "SELECT feedback FROM use_cases WHERE id = $1", use_case_id
    )
    new_feedback = body.feedback
    if row["feedback"] == new_feedback:
        new_feedback = None

    await conn.execute(
        "UPDATE use_cases SET feedback = $1 WHERE id = $2 AND session_id = $3",
        new_feedback,
        use_case_id,
        session_id,
    )

    return {"useCaseId": use_case_id, "feedback": new_feedback}
