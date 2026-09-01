from typing import Any, Optional

from fastapi import APIRouter
from pydantic import BaseModel

from agents.avatar_agent import get_guidance

router = APIRouter()


class AvatarRequest(BaseModel):
    stage: str
    context: Optional[dict[str, Any]] = None


@router.post("/avatar/guidance")
async def avatar_guidance(body: AvatarRequest):
    return await get_guidance(body.stage, body.context)
