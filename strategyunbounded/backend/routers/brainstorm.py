import asyncio
import json
import logging
from typing import AsyncGenerator

from fastapi import APIRouter, Request
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from agents.brainstorm_agent import analyse_problem
from agents.planner_agent import plan_brainstorm
from agents.priority_agent import nominate_priorities
from database import get_pool

router = APIRouter()
logger = logging.getLogger(__name__)


class BrainstormRequest(BaseModel):
    sessionId: str


def _use_case_to_api(uc: dict) -> dict:
    return {
        "id": uc["id"],
        "sessionId": uc["session_id"],
        "problemId": uc["problem_id"],
        "problemIndex": uc["problem_index"],
        "title": uc["title"],
        "summary": uc["summary"],
        "aiPriority": uc["ai_priority"],
        "userPriority": uc["user_priority"],
        "feedback": uc["feedback"],
        "description": uc["description"],
        "howItWorks": uc["how_it_works"],
        "dataRequired": uc["data_required"],
        "timeToImplement": uc["time_to_implement"],
        "complexity": uc["complexity"],
        "estimatedCostRoi": uc["estimated_cost_roi"],
        "alsoAddresses": uc["also_addresses"],
    }


async def _stream(session_id: str, request: Request) -> AsyncGenerator[dict, None]:
    pool = get_pool()

    logger.info("[STREAM] Starting for session=%s", session_id)
    async with pool.acquire() as conn:
        session = await conn.fetchrow(
            "SELECT status FROM sessions WHERE id = $1", session_id
        )
        if not session:
            logger.warning("[STREAM] session=%s not found", session_id)
            yield {"event": "error", "data": json.dumps({"message": "Session not found"})}
            return
        if session["status"] != "active":
            logger.info("[STREAM] session=%s already processed (status=%s)", session_id, session["status"])
            yield {"event": "error", "data": json.dumps({"message": "Session already processed"})}
            return
        uc_count = await conn.fetchval(
            "SELECT COUNT(*) FROM use_cases WHERE session_id = $1", session_id
        )
        if uc_count > 0:
            logger.info("[STREAM] session=%s already has %d use cases", session_id, uc_count)
            yield {"event": "error", "data": json.dumps({"message": "Brainstorm already ran for this session"})}
            return

        problems = await conn.fetch(
            "SELECT id, idx, text FROM problems WHERE session_id = $1 ORDER BY idx",
            session_id,
        )
        prompt_row = await conn.fetchrow(
            "SELECT value FROM settings WHERE key = 'system_prompt'"
        )
        system_prompt = prompt_row["value"] if prompt_row else ""
    logger.info("[STREAM] session=%s has %d problems", session_id, len(problems))

    all_problem_texts = [p["text"] for p in problems]

    # Emit status events while the planner runs.
    # Without these the browser drops the idle SSE connection during the
    # 20-30 s planner LLM call, causing the stream to silently fail.
    _PLANNER_MSGS = [
        "Analysing your five challenges…",
        "Identifying cross-cutting themes…",
        "Mapping relationships between problems…",
        "Calibrating agent instructions…",
        "Almost ready to launch…",
    ]
    yield {"event": "status", "data": json.dumps({"message": _PLANNER_MSGS[0]})}
    planner_task = asyncio.create_task(plan_brainstorm(all_problem_texts))
    _msg_idx = 1
    while True:
        done, _ = await asyncio.wait({planner_task}, timeout=7.0)
        if done:
            break
        msg = _PLANNER_MSGS[_msg_idx % len(_PLANNER_MSGS)]
        logger.debug("[STREAM] Status keepalive: %s", msg)
        yield {"event": "status", "data": json.dumps({"message": msg})}
        _msg_idx += 1
    planner_output = planner_task.result()
    logger.info("[STREAM] Planner done for session=%s", session_id)
    yield {"event": "status", "data": json.dumps({"message": "Launching five AI agents in parallel…"})}
    meta_by_index = {m.index: m for m in planner_output.problem_metas}

    queue: asyncio.Queue = asyncio.Queue()
    all_use_cases: list[dict] = []

    async def run_problem(prob):
        prob_idx = prob["idx"]
        meta = meta_by_index.get(prob_idx)
        logger.info("[STREAM] Problem %d starting (session=%s)", prob_idx, session_id)
        try:
            use_cases = await asyncio.wait_for(
                analyse_problem(
                    problem=prob["text"],
                    problem_index=prob_idx,
                    problem_id=prob["id"],
                    session_id=session_id,
                    system_prompt=system_prompt,
                    all_problems=all_problem_texts,
                    planner_meta=meta,
                    cross_cutting_hint=planner_output.cross_cutting_hint,
                ),
                timeout=90.0,
            )
            logger.info("[STREAM] Problem %d: got %d use cases — writing to DB", prob_idx, len(use_cases))
            async with pool.acquire() as conn:
                async with conn.transaction():
                    for uc in use_cases:
                        await conn.execute(
                            """
                            INSERT INTO use_cases (
                                id, session_id, problem_id, problem_index,
                                title, summary, description, how_it_works,
                                data_required, time_to_implement, complexity,
                                estimated_cost_roi, also_addresses, ai_priority, user_priority, feedback
                            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
                            """,
                            uc["id"], uc["session_id"], uc["problem_id"], uc["problem_index"],
                            uc["title"], uc["summary"], uc["description"], uc["how_it_works"],
                            uc["data_required"], uc["time_to_implement"], uc["complexity"],
                            uc["estimated_cost_roi"], uc["also_addresses"], None, None, None,
                        )
            logger.info("[STREAM] Problem %d: DB write OK — queuing problem_done event", prob_idx)
            await queue.put({"ok": True, "problemIndex": prob_idx, "useCases": use_cases})
        except asyncio.TimeoutError:
            logger.error("[STREAM] Problem %d: TIMEOUT after 90s", prob_idx)
            await queue.put({
                "ok": False,
                "problemIndex": prob_idx,
                "message": "Generation timed out for this problem — please retry.",
            })
        except Exception as exc:
            logger.error("[STREAM] Problem %d: ERROR %s: %s", prob_idx, type(exc).__name__, exc)
            await queue.put({"ok": False, "problemIndex": prob_idx, "message": str(exc)})

    tasks = [asyncio.create_task(run_problem(p)) for p in problems]

    for _ in range(len(problems)):
        if await request.is_disconnected():
            for t in tasks:
                t.cancel()
            return
        result = await queue.get()
        if result["ok"]:
            all_use_cases.extend(result["useCases"])
            logger.info("[STREAM] SSE emit problem_done for problemIndex=%d (%d use cases)", result["problemIndex"], len(result["useCases"]))
            yield {
                "event": "problem_done",
                "data": json.dumps({
                    "problemIndex": result["problemIndex"],
                    "useCases": [_use_case_to_api(uc) for uc in result["useCases"]],
                }),
            }
        else:
            logger.warning("[STREAM] SSE emit problem_error for problemIndex=%d: %s", result["problemIndex"], result["message"])
            yield {
                "event": "problem_error",
                "data": json.dumps({
                    "problemIndex": result["problemIndex"],
                    "message": result["message"],
                }),
            }

    await asyncio.gather(*tasks, return_exceptions=True)

    logger.info("[STREAM] All problems complete — total use cases collected: %d", len(all_use_cases))

    if not all_use_cases:
        logger.error("[STREAM] Zero use cases generated — marking session=%s as failed", session_id)
        async with pool.acquire() as conn:
            await conn.execute(
                "UPDATE sessions SET status = 'failed' WHERE id = $1",
                session_id,
            )
        yield {"event": "error", "data": json.dumps({"message": "No use cases were generated. Please start a new session."})}
        return

    priorities: dict[str, str] = {}
    try:
        priorities = await nominate_priorities(all_use_cases)
        logger.info("[STREAM] Priorities nominated: %s", priorities)
    except Exception as exc:
        logger.error("[STREAM] Priority nomination failed (%s: %s) — no priorities set", type(exc).__name__, exc)
        priorities = {}

    async with pool.acquire() as conn:
        async with conn.transaction():
            for slot, uc_id in priorities.items():
                await conn.execute(
                    "UPDATE use_cases SET ai_priority = $1, user_priority = $1 WHERE id = $2",
                    int(slot),
                    uc_id,
                )
            await conn.execute(
                "UPDATE sessions SET status = 'complete' WHERE id = $1",
                session_id,
            )
    logger.info("[STREAM] Session=%s marked complete — emitting done event", session_id)

    yield {
        "event": "done",
        "data": json.dumps({"sessionId": session_id, "priorities": priorities}),
    }


@router.post("/brainstorm")
async def brainstorm(body: BrainstormRequest, request: Request):
    return EventSourceResponse(_stream(body.sessionId, request))
