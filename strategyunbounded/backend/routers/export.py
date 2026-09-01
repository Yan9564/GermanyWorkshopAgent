from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from database import get_db
from ppt.builder import build_pptx

router = APIRouter()

PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation"


@router.get("/sessions/{session_id}/export/pptx")
async def export_pptx(session_id: str, conn=Depends(get_db)):
    session = await conn.fetchrow(
        "SELECT id, status, created_at FROM sessions WHERE id = $1", session_id
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session["status"] == "failed":
        raise HTTPException(status_code=409, detail="Brainstorming failed — please start a new session")
    if session["status"] != "complete":
        raise HTTPException(status_code=409, detail="Brainstorming not yet complete")

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
        use_cases = []
        for r in uc_rows:
            use_cases.append({
                "id": r["id"],
                "title": r["title"],
                "summary": r["summary"],
                "aiPriority": r["ai_priority"],
                "userPriority": r["user_priority"],
                "feedback": r["feedback"],
                "description": r["description"],
                "howItWorks": list(r["how_it_works"]),
                "dataRequired": r["data_required"],
                "timeToImplement": r["time_to_implement"],
                "complexity": r["complexity"],
                "estimatedCostRoi": r["estimated_cost_roi"],
                "problemIndex": r["problem_index"],
            })
        result_problems.append({"id": prob["id"], "index": prob["idx"], "text": prob["text"], "useCases": use_cases})

    session_data = {
        "id": session["id"],
        "createdAt": session["created_at"],
        "problems": result_problems,
    }

    buffer = build_pptx(session_data)

    return StreamingResponse(
        buffer,
        media_type=PPTX_MIME,
        headers={"Content-Disposition": f'attachment; filename="workshop-results-{session_id[:8]}.pptx"'},
    )
