"""Small rate limiter for sensitive auth endpoints.

Counters live in Redis (shared across workers); if Redis is unreachable it falls back to process
memory so auth keeps working. Keys are hashed so raw emails never sit in Redis.
"""
from __future__ import annotations

import hashlib
import time
from collections import defaultdict, deque

from fastapi import Request

from app.core.exceptions import RateLimitedError
from app.core.logging import get_logger

logger = get_logger(__name__)

_memory_hits: dict[str, deque[float]] = defaultdict(deque)
_memory_cooldowns: dict[str, float] = {}


def _key(*parts: str) -> str:
    raw = "|".join(p.strip().lower() for p in parts)
    return "rl:" + hashlib.sha256(raw.encode()).hexdigest()[:40]


def client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _too_many(retry_after: int) -> RateLimitedError:
    retry_after = max(1, int(retry_after))
    return RateLimitedError(
        message_en=f"Too many attempts. Please wait {retry_after} seconds and try again.",
        message_bn=f"অনেকবার চেষ্টা করা হয়েছে। {retry_after} সেকেন্ড পরে আবার চেষ্টা করুন।",
        details={"retryAfter": retry_after},
    )


async def limit(request: Request, scope: str, ident: str, max_hits: int, window_seconds: int) -> None:
    """Allow at most ``max_hits`` calls per ``window_seconds`` for (scope, ident); else 429."""
    key = _key(scope, ident)
    redis = getattr(request.app.state, "redis", None)
    if redis is not None:
        try:
            count = await redis.incr(key)
            if count == 1:
                await redis.expire(key, window_seconds)
            if count > max_hits:
                raise _too_many(await redis.ttl(key))
            return
        except RateLimitedError:
            raise
        except Exception as exc:  # noqa: BLE001 - Redis down: fall back to memory
            logger.warning("rate_limit_redis_unavailable", error=str(exc))
    now = time.monotonic()
    hits = _memory_hits[key]
    while hits and hits[0] <= now - window_seconds:
        hits.popleft()
    if len(hits) >= max_hits:
        raise _too_many(window_seconds - (now - hits[0]))
    hits.append(now)


async def cooldown(request: Request, scope: str, ident: str, seconds: int) -> None:
    """At most one call per ``seconds`` for (scope, ident); else 429 with the remaining wait."""
    key = _key("cd", scope, ident)
    redis = getattr(request.app.state, "redis", None)
    if redis is not None:
        try:
            if await redis.set(key, "1", ex=seconds, nx=True):
                return
            raise _too_many(await redis.ttl(key))
        except RateLimitedError:
            raise
        except Exception as exc:  # noqa: BLE001
            logger.warning("rate_limit_redis_unavailable", error=str(exc))
    now = time.monotonic()
    until = _memory_cooldowns.get(key, 0)
    if until > now:
        raise _too_many(until - now)
    _memory_cooldowns[key] = now + seconds
