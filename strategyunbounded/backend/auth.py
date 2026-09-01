from jose import JWTError, jwt
from fastapi import Request, HTTPException

from config import settings

ALGORITHM = "HS256"
COOKIE_NAME = "workshop_session"


def create_session_token(role: str) -> str:
    return jwt.encode({"role": role}, settings.SESSION_SECRET, algorithm=ALGORITHM)


def get_role(request: Request) -> str:
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        return "user"
    try:
        payload = jwt.decode(token, settings.SESSION_SECRET, algorithms=[ALGORITHM])
        return payload.get("role", "user")
    except JWTError:
        return "user"


def require_admin(request: Request) -> None:
    if get_role(request) != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
