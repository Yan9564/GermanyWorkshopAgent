import hashlib
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator

from database import get_db

router = APIRouter()


def _compute_hash(problems: List[str]) -> str:
    joined = "\n---\n".join(p.strip() for p in problems)
    return hashlib.sha256(joined.encode()).hexdigest()


def _use_case_to_dict(row) -> dict:
    return {
        "id": row["id"],
        "sessionId": row["session_id"],
        "problemId": row["problem_id"],
        "problemIndex": row["problem_index"],
        "title": row["title"],
        "summary": row["summary"],
        "aiPriority": row["ai_priority"],
        "userPriority": row["user_priority"],
        "feedback": row["feedback"],
        "description": row["description"],
        "howItWorks": list(row["how_it_works"]),
        "dataRequired": row["data_required"],
        "timeToImplement": row["time_to_implement"],
        "complexity": row["complexity"],
        "estimatedCostRoi": row["estimated_cost_roi"],
        "alsoAddresses": list(row["also_addresses"]),
    }


class SessionRequest(BaseModel):
    problems: List[str]

    @field_validator("problems")
    @classmethod
    def validate_problems(cls, v):
        if len(v) != 5:
            raise ValueError("Exactly 5 problems are required")
        errors = []
        for i, p in enumerate(v):
            if len(p.strip()) < 10:
                errors.append(f"Problem {i + 1} is too short (minimum 10 characters)")
            if len(p.strip()) > 2000:
                errors.append(f"Problem {i + 1} is too long (maximum 2000 characters)")
        if errors:
            raise ValueError(errors)
        return v


@router.post("/sessions")
async def create_or_get_session(body: SessionRequest, conn=Depends(get_db)):
    problems_hash = _compute_hash(body.problems)

    existing = await conn.fetchrow(
        """
        SELECT id FROM sessions
        WHERE problems_hash = $1 AND status = 'complete'
        ORDER BY created_at DESC
        LIMIT 1
        """,
        problems_hash,
    )

    if existing:
        session_id = existing["id"]
        problem_rows = await conn.fetch(
            "SELECT id FROM problems WHERE session_id = $1 ORDER BY idx",
            session_id,
        )
        return {
            "sessionId": session_id,
            "problemIds": [r["id"] for r in problem_rows],
            "cached": True,
        }

    prompt_row = await conn.fetchrow(
        "SELECT value FROM settings WHERE key = 'system_prompt'"
    )
    system_prompt = prompt_row["value"] if prompt_row else ""

    session_id = str(uuid.uuid4())
    problem_ids = [str(uuid.uuid4()) for _ in range(5)]

    async with conn.transaction():
        await conn.execute(
            """
            INSERT INTO sessions (id, status, system_prompt_snapshot, problems_hash)
            VALUES ($1, 'active', $2, $3)
            """,
            session_id,
            system_prompt,
            problems_hash,
        )
        for i, (problem_id, text) in enumerate(zip(problem_ids, body.problems)):
            await conn.execute(
                "INSERT INTO problems (id, session_id, idx, text) VALUES ($1, $2, $3, $4)",
                problem_id,
                session_id,
                i,
                text.strip(),
            )

    return {
        "sessionId": session_id,
        "problemIds": problem_ids,
        "cached": False,
    }


@router.get("/sessions/{session_id}")
async def get_session(session_id: str, conn=Depends(get_db)):
    session = await conn.fetchrow(
        "SELECT id, status, created_at FROM sessions WHERE id = $1",
        session_id,
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    problems = await conn.fetch(
        "SELECT id, idx, text FROM problems WHERE session_id = $1 ORDER BY idx",
        session_id,
    )

    result_problems = []
    for prob in problems:
        uc_rows = await conn.fetch(
            """
            SELECT * FROM use_cases
            WHERE problem_id = $1
            ORDER BY COALESCE(user_priority, 999), id
            """,
            prob["id"],
        )
        result_problems.append(
            {
                "id": prob["id"],
                "index": prob["idx"],
                "text": prob["text"],
                "useCases": [_use_case_to_dict(r) for r in uc_rows],
            }
        )

    return {
        "id": session["id"],
        "status": session["status"],
        "problems": result_problems,
    }
