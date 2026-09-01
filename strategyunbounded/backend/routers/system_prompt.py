from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from auth import require_admin
from database import get_db
from config import settings

router = APIRouter()


async def _upsert_prompt(content: str, conn) -> dict:
    row = await conn.fetchrow(
        """
        INSERT INTO settings (key, value, updated_at)
        VALUES ('system_prompt', $1, NOW())
        ON CONFLICT (key) DO UPDATE
          SET value = EXCLUDED.value, updated_at = NOW()
        RETURNING value, updated_at
        """,
        content,
    )
    return {"content": row["value"], "updatedAt": row["updated_at"].isoformat()}


@router.get("/system-prompt")
async def get_system_prompt(conn=Depends(get_db)):
    row = await conn.fetchrow(
        "SELECT value, updated_at FROM settings WHERE key = 'system_prompt'"
    )
    if not row:
        return {"content": "", "updatedAt": None}
    return {"content": row["value"], "updatedAt": row["updated_at"].isoformat()}


class PromptUpdate(BaseModel):
    content: str


@router.put("/system-prompt")
async def update_system_prompt(
    body: PromptUpdate,
    request: Request,
    conn=Depends(get_db),
    _=Depends(require_admin),
):
    return await _upsert_prompt(body.content, conn)


@router.post("/system-prompt/reset")
async def reset_system_prompt(
    request: Request,
    conn=Depends(get_db),
    _=Depends(require_admin),
):
    return await _upsert_prompt(settings.DEFAULT_SYSTEM_PROMPT, conn)
