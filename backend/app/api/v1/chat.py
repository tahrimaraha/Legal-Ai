"""`/chat`, `/recommend/analyze`, `/insights/crime` — the AI recommendation endpoints.

These read the prebuilt corpus (SQLite) and need no Postgres/Redis, so the assistant works even when only the
API process is running. See app/rag/ for the engine.
"""
from __future__ import annotations

import time
import uuid
from functools import lru_cache
from pathlib import Path

from fastapi import APIRouter, Query
from fastapi.concurrency import run_in_threadpool

from app.config import settings
from app.core.exceptions import AppError, NotFoundError
from app.core.logging import get_logger
from app.rag import llm
from app.rag.engine import LegalEngine
from app.rag.lexicon import CRIME_LABELS, TOPIC_BY_ID
from app.schemas.chat import ChatRequest, RecommendRequest

logger = get_logger(__name__)
router = APIRouter()
BACKEND_ROOT = Path(__file__).resolve().parents[3]


class CorpusMissing(AppError):
    status_code = 503
    code = "CORPUS_NOT_BUILT"
    message_en = "The legal corpus has not been built yet. Run: python -m scripts.build_corpus --raw data/raw"
    message_bn = "আইনের ডেটাবেস এখনও তৈরি হয়নি। চালান: python -m scripts.build_corpus --raw data/raw"


@lru_cache
def get_engine() -> LegalEngine:
    path = Path(settings.corpus_path)
    if not path.is_absolute():
        path = BACKEND_ROOT / path
    if not path.exists():
        raise CorpusMissing()
    t0 = time.perf_counter()
    engine = LegalEngine(path)
    logger.info("corpus_loaded", acts=len(engine.acts), seconds=round(time.perf_counter() - t0, 2))
    return engine


def corpus_status() -> dict | str:
    try:
        return get_engine().stats()
    except CorpusMissing:
        return "not_built"


@router.post("/chat")
async def chat(payload: ChatRequest) -> dict:
    engine = get_engine()
    history = [h.model_dump() for h in payload.history]
    result = await run_in_threadpool(engine.answer, payload.question, history)
    msg = result["message"]
    if settings.gemini_api_key and msg["citations"]:
        steps = next((TOPIC_BY_ID[t].steps_en for t in result["topics"] if TOPIC_BY_ID[t].steps_en), [])
        rewritten = await llm.rewrite(payload.question, msg["citations"], steps, history)
        if rewritten:
            msg["bodyEn"], msg["bodyBn"] = rewritten
    return {"message": msg, "conversationId": payload.conversationId or f"conv-{uuid.uuid4().hex[:10]}", "topics": result["topics"]}


@router.post("/recommend/analyze")
async def recommend(payload: RecommendRequest) -> dict:
    return await run_in_threadpool(get_engine().recommend, payload.query)


@router.get("/insights/crime")
async def crime_insight(category: str = Query(..., description="e.g. Theft, Murder, Woman & Child Repression")) -> dict:
    engine = get_engine()
    if category not in CRIME_LABELS:
        raise NotFoundError("Unknown crime category.", "অজানা অপরাধের ধরন।", {"allowed": sorted(CRIME_LABELS)})
    return {"national": engine.crime.national(category), "districts": engine.crime.district_stats(category),
            "rate": engine.crime.rate(), "partialYears": engine.crime.partial_years}


@router.get("/corpus/stats")
async def stats() -> dict:
    return get_engine().stats()
