import asyncio
import logging
from pathlib import Path
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import asyncpg
from fastapi import FastAPI

from config import settings

logger = logging.getLogger(__name__)
_pool: asyncpg.Pool | None = None


async def init_db(app: FastAPI) -> None:
    global _pool
    logger.info("Connecting to database…")
    try:
        _pool = await asyncio.wait_for(
            asyncpg.create_pool(settings.DATABASE_URL, min_size=2, max_size=10, ssl="require"),
            timeout=15.0,
        )
    except asyncio.TimeoutError:
        raise RuntimeError(
            "Database unreachable: connection timed out after 15 s. "
            "Check DATABASE_URL and that the server is accessible from this machine."
        )
    logger.info("Database pool created")
    app.state.pool = _pool

    migrations_dir = Path(__file__).parent / "migrations"
    migration_files = sorted(migrations_dir.glob("*.sql"))
    async with _pool.acquire() as conn:
        for migration_file in migration_files:
            logger.info("Running migration: %s", migration_file.name)
            await conn.execute(migration_file.read_text())
            logger.info("Migration OK: %s", migration_file.name)
        await conn.execute(
            "INSERT INTO settings (key, value) VALUES ('system_prompt', $1) ON CONFLICT (key) DO NOTHING",
            settings.DEFAULT_SYSTEM_PROMPT,
        )
    logger.info("Database initialised — all migrations applied")


async def close_db() -> None:
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


async def get_db() -> AsyncGenerator[asyncpg.Connection, None]:
    async with _pool.acquire() as conn:
        yield conn


def get_pool() -> asyncpg.Pool:
    return _pool
