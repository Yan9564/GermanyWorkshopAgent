import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import init_db, close_db
from routers import auth, system_prompt, sessions, brainstorm, use_cases, export, avatar, voice, discussion, stage2

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db(app)
    yield
    await close_db()


app = FastAPI(title="Service Workshop API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.ALLOWED_ORIGINS.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(system_prompt.router, prefix="/api")
app.include_router(sessions.router, prefix="/api")
app.include_router(brainstorm.router, prefix="/api")
app.include_router(use_cases.router, prefix="/api")
app.include_router(export.router, prefix="/api")
app.include_router(avatar.router, prefix="/api")
app.include_router(voice.router, prefix="/api")
app.include_router(discussion.router, prefix="/api")
app.include_router(stage2.router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}
