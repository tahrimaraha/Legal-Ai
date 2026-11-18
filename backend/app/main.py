"""FastAPI application entrypoint."""
from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

import redis.asyncio as aioredis
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.v1.chat import corpus_status
from app.api.v1.router import api_router
from app.config import settings
from app.core.exceptions import AppError
from app.core.logging import configure_logging, get_logger
from app.core.middleware import RequestContextMiddleware
from app.database import check_db_connection, engine

configure_logging()
logger = get_logger(__name__)


async def ensure_app_tables() -> None:
    """Create the `app_records` table if missing (idempotent).

    The database's recorded Alembic revision is not in this repo, so this table is created here
    rather than through a migration.
    """
    from app.models.app_record import AppRecord

    try:
        async with engine.begin() as conn:
            await conn.run_sync(lambda sync_conn: AppRecord.__table__.create(sync_conn, checkfirst=True))
    except Exception:
        logger.exception("app_records_table_create_failed")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Set up and tear down process-wide resources (DB engine, Redis pool)."""
    app.state.redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    await ensure_app_tables()
    corpus_status()  # opens the legal corpus and starts loading the trained models in the background
    logger.info("app_startup", app_env=settings.app_env)
    try:
        yield
    finally:
        await app.state.redis.close()
        await engine.dispose()
        logger.info("app_shutdown")


app = FastAPI(
    title=settings.app_name,
    description="RAG-based Bengali/English legal assistant backend — citizen, "
    "lawyer and admin APIs.",
    version="1.0.0",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    openapi_url="/openapi.json" if settings.debug else None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=settings.cors_allow_lan_regex if settings.debug else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)
app.add_middleware(RequestContextMiddleware)


# --- Uniform error envelope ------------------------------------------------

@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message_en": exc.message_en,
                "message_bn": exc.message_bn,
                "details": exc.details,
            }
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message_en": "The submitted data is invalid.",
                "message_bn": "প্রদত্ত তথ্য সঠিক নয়।",
                "details": {"errors": exc.errors()},
            }
        },
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": "HTTP_ERROR",
                "message_en": str(exc.detail),
                "message_bn": "একটি ত্রুটি ঘটেছে।",
                "details": {},
            }
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("unhandled_exception", path=request.url.path)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message_en": "Something went wrong. Please try again.",
                "message_bn": "কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।",
                "details": {},
            }
        },
    )


# --- Health -----------------------------------------------------------------

@app.get("/health", tags=["health"])
async def liveness() -> dict:
    """Liveness probe — process is up and serving requests."""
    return {"status": "ok"}


@app.get("/health/ready", tags=["health"])
async def readiness(request: Request) -> JSONResponse:
    """Readiness probe — checks DB, Redis, vector store and Gemini reachability."""
    db_ok = await check_db_connection()

    redis_ok = False
    try:
        redis_ok = bool(await request.app.state.redis.ping())
    except Exception:
        redis_ok = False

    checks = {
        "database": db_ok,
        "redis": redis_ok,
        "vector_store": corpus_status(),
        "gemini": "not_configured" if not settings.gemini_api_key else "configured",
    }
    is_ready = db_ok and redis_ok
    return JSONResponse(
        status_code=status.HTTP_200_OK if is_ready else status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"status": "ready" if is_ready else "degraded", "checks": checks},
    )


app.include_router(api_router, prefix=settings.api_v1_prefix)


# --- Single-container hosting: serve the built website from the API (FRONTEND_DIST_DIR) -------------
# Registered last, so /api/*, /health and /docs keep priority. Any other GET returns the real file if it
# exists (assets, images) or index.html, so client-side routes like /app/chat survive a page reload.
if settings.frontend_dist_dir:
    from pathlib import Path

    from fastapi.responses import FileResponse

    _dist = Path(settings.frontend_dist_dir).resolve()
    _index = _dist / "index.html"
    if _index.is_file():

        @app.get("/{path:path}", include_in_schema=False)
        async def spa(path: str) -> FileResponse:
            if path.startswith(settings.api_v1_prefix.strip("/") + "/"):
                raise StarletteHTTPException(status_code=404)
            target = (_dist / path).resolve()
            if path and target.is_file() and _dist in target.parents:  # no ../ escapes
                cache = "public, max-age=31536000, immutable" if path.startswith("assets/") else "no-cache"
                return FileResponse(target, headers={"Cache-Control": cache})
            return FileResponse(_index, headers={"Cache-Control": "no-cache"})
    else:
        logger.warning("frontend_dist_missing", path=str(_dist))
