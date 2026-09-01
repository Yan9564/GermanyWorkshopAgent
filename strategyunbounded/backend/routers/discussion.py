import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from database import get_db

router = APIRouter()


class DiscussionEntryRequest(BaseModel):
    transcript: str
    speaker_label: Optional[str] = None


@router.post("/sessions/{session_id}/discussion")
async def post_discussion_entry(
    session_id: str,
    body: DiscussionEntryRequest,
    conn=Depends(get_db),
):
    session = await conn.fetchrow("SELECT id FROM sessions WHERE id = $1", session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    entry_id = str(uuid.uuid4())
    row = await conn.fetchrow(
        """
        INSERT INTO discussion_entries (id, session_id, speaker_label, transcript)
        VALUES ($1, $2, $3, $4)
        RETURNING id, speaker_label, transcript, recorded_at
        """,
        entry_id,
        session_id,
        body.speaker_label,
        body.transcript,
    )
    return {
        "id": row["id"],
        "transcript": row["transcript"],
        "speaker_label": row["speaker_label"],
        "recorded_at": row["recorded_at"].isoformat(),
    }


@router.get("/sessions/{session_id}/discussion")
async def get_discussion_entries(session_id: str, conn=Depends(get_db)):
    rows = await conn.fetch(
        """
        SELECT id, speaker_label, transcript, recorded_at
        FROM discussion_entries
        WHERE session_id = $1
        ORDER BY recorded_at ASC
        """,
        session_id,
    )
    return {
        "entries": [
            {
                "id": r["id"],
                "speaker_label": r["speaker_label"],
                "transcript": r["transcript"],
                "recorded_at": r["recorded_at"].isoformat(),
            }
            for r in rows
        ]
    }
