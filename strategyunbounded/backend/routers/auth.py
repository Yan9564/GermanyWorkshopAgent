import secrets

from fastapi import APIRouter, Request, Response, HTTPException
from pydantic import BaseModel

from auth import create_session_token, get_role, COOKIE_NAME
from config import settings

router = APIRouter()


class PinRequest(BaseModel):
    pin: str


@router.post("/auth/admin")
async def login_admin(body: PinRequest, response: Response):
    if not secrets.compare_digest(body.pin, settings.ADMIN_PIN):
        raise HTTPException(status_code=401, detail="Invalid PIN")
    token = create_session_token("admin")
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,  # set True in production behind HTTPS
    )
    return {"role": "admin"}


@router.get("/auth/me")
async def me(request: Request):
    return {"role": get_role(request)}
