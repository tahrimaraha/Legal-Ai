"""FastAPI application entrypoint."""
from __future__ import annotations

from contextlib import asynccontextmanager
import posixpath
from pathlib import Path
from typing import AsyncIterator

import redis.asyncio as aioredis
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.v1.router import api_router
from app.config import settings
from app.core.exceptions import AppError
from app.core.logging import configure_logging, get_logger
from app.core.middleware import RequestContextMiddleware
from app.database import check_db_connection, engine
from app.providers.storage import PRIVATE_FOLDERS, PUBLIC_PREFIX

configure_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Set up and tear down process-wide resources (DB engine, Redis pool)."""
    app.state.redis = aioredis.from_url(settings.redis_url, decode_responses=True)
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
        # Wired up once the RAG module (vector store + Gemini client) lands.
        "vector_store": "not_configured",
        "gemini": "not_configured" if not settings.gemini_api_key else "configured",
    }
    is_ready = db_ok and redis_ok
    return JSONResponse(
        status_code=status.HTTP_200_OK if is_ready else status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"status": "ready" if is_ready else "degraded", "checks": checks},
    )


app.include_router(api_router, prefix=settings.api_v1_prefix)

# Local-storage uploads (see app/providers/storage).
Path(settings.local_storage_root).mkdir(parents=True, exist_ok=True)


class PublicFiles(StaticFiles):
    """Serves uploads except private folders (e.g. lawyers' ID documents)."""

    async def get_response(self, path: str, scope):  # type: ignore[override]
        # Normalise ("./", "//", "a/../") and lower-case: the storage volume may be
        # case-insensitive (macOS), so "LICENSES/" must not slip through.
        normalized = posixpath.normpath("/" + path.replace("\\", "/")).lstrip("/").lower()
        if normalized.split("/", 1)[0] in PRIVATE_FOLDERS:
            return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content={"detail": "Not Found"})
        return await super().get_response(path, scope)


app.mount(PUBLIC_PREFIX, PublicFiles(directory=settings.local_storage_root), name="files")
