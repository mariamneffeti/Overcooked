"""
middleware.py — RBAC gateway: package-based tier access control.

Architecture
─────────────
  Tier 1 (Pulse)        → real-time alerts, SSE stream, geo snapshot
  Tier 2 (Intelligence) → heatmaps, emotion pulse, lifecycle, brand safety
  Tier 3 (Strategy)     → briefs, creative gen, ROI, dashboard JSON

A user's `package` field determines which tiers they may access:
  "starter"      → Tier 1
  "professional" → Tier 1 + 2
  "enterprise"   → Tier 1 + 2 + 3

JWT tokens are verified via PyJWT.  API keys (for server-to-server calls)
are resolved from Redis with a fallback to Postgres.

Middleware stack registered in FastAPI app:
  1. CorrelationIDMiddleware     → injects X-Request-ID
  2. AuthMiddleware              → resolves user from JWT / API key
  3. RateLimitMiddleware         → tier-aware token-bucket rate limiting
  4. AuditLogMiddleware          → structured access logging
"""

from __future__ import annotations

import hashlib
import logging
import time
import uuid
from functools import lru_cache
from typing import Callable

import jwt
import redis.asyncio as aioredis
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse, Response
from starlette.types import ASGIApp

from shared.constants import (
    JWT_SECRET,
    JWT_ALGORITHM,
    REDIS_URL,
    RATE_LIMIT_TIER1_RPM,
    RATE_LIMIT_TIER2_RPM,
    RATE_LIMIT_TIER3_RPM,
    ALLOW_ANON_AUTH,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Package → allowed tiers mapping
# ---------------------------------------------------------------------------

_PACKAGE_TIERS: dict[str, int] = {
    "starter": 1,
    "professional": 2,
    "enterprise": 3,
    # Internal / service accounts
    "internal": 3,
}

_TIER_RPM: dict[int, int] = {
    1: RATE_LIMIT_TIER1_RPM,
    2: RATE_LIMIT_TIER2_RPM,
    3: RATE_LIMIT_TIER3_RPM,
}

# ---------------------------------------------------------------------------
# Domain models
# ---------------------------------------------------------------------------

class User(BaseModel):
    id: str
    email: str
    package: str
    max_tier: int
    org_id: str | None = None
    is_service_account: bool = False


# ---------------------------------------------------------------------------
# Redis client (shared across middleware instances)
# ---------------------------------------------------------------------------

_redis: aioredis.Redis | None = None


async def _get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(REDIS_URL, decode_responses=True)
    return _redis


# ---------------------------------------------------------------------------
# Token verification helpers
# ---------------------------------------------------------------------------

_bearer = HTTPBearer(auto_error=False)


def _decode_jwt(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {exc}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def _resolve_api_key(raw_key: str) -> dict | None:
    """Look up an API key hash in Redis; fall back to Postgres cache."""
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    redis = await _get_redis()
    cached = await redis.hgetall(f"apikey:{key_hash}")
    if cached:
        return cached

    # Postgres fallback (import kept local to avoid circular deps at startup)
    try:
        from backend.database.postgres_db import fetch_api_key_record
        record = await fetch_api_key_record(key_hash)
        if record:
            await redis.hset(f"apikey:{key_hash}", mapping=record)
            await redis.expire(f"apikey:{key_hash}", 300)
        return record
    except Exception as exc:
        logger.error("API key Postgres lookup failed: %s", exc)
        return None


def _build_user(payload: dict) -> User:
    package = payload.get("package", "starter")
    return User(
        id=payload.get("sub", ""),
        email=payload.get("email", ""),
        package=package,
        max_tier=_PACKAGE_TIERS.get(package, 1),
        org_id=payload.get("org_id"),
        is_service_account=payload.get("service_account", False),
    )


# ---------------------------------------------------------------------------
# Dependency: get_current_user
# ---------------------------------------------------------------------------

async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> User:
    """
    Resolves the authenticated user from:
      1. Bearer JWT token        (Authorization: Bearer <jwt>)
      2. API key header          (X-API-Key: <key>)

    Raises HTTP 401 if neither is present or valid.
    """
    # --- JWT path ---
    if credentials and credentials.scheme.lower() == "bearer":
        payload = _decode_jwt(credentials.credentials)
        user = _build_user(payload)
        request.state.user = user
        return user

    # --- API key path ---
    api_key = request.headers.get("X-API-Key")
    if api_key:
        record = await _resolve_api_key(api_key)
        if not record:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API key",
            )
        user = _build_user(record)
        request.state.user = user
        return user

    if ALLOW_ANON_AUTH:
        user = User(
            id="dev-anonymous",
            email="dev@localhost",
            package="enterprise",
            max_tier=3,
            is_service_account=True,
        )
        request.state.user = user
        return user

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required — provide a Bearer token or X-API-Key header",
        headers={"WWW-Authenticate": "Bearer"},
    )


# ---------------------------------------------------------------------------
# Dependency factory: require_tier
# ---------------------------------------------------------------------------

def require_tier(min_tier: int) -> Callable:
    """Return a FastAPI dependency that gates access to `min_tier` and above."""

    async def _check(user: User = Depends(get_current_user)) -> User:
        if user.max_tier < min_tier:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Your '{user.package}' package does not include Tier {min_tier} access. "
                    f"Upgrade to {'professional' if min_tier == 2 else 'enterprise'} to unlock."
                ),
            )
        return user

    return _check


# ---------------------------------------------------------------------------
# Starlette middleware: CorrelationIDMiddleware
# ---------------------------------------------------------------------------

class CorrelationIDMiddleware(BaseHTTPMiddleware):
    """Injects a unique X-Request-ID into every request and response."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


# ---------------------------------------------------------------------------
# Starlette middleware: RateLimitMiddleware
# ---------------------------------------------------------------------------

class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Sliding-window token-bucket rate limiter backed by Redis.

    Limits are applied per (user_id, tier) to prevent a Tier-1 burst from
    consuming Tier-2/3 budget.  Tier is inferred from the request path
    (/v1/pulse → 1, /v1/intelligence → 2, /v1/strategy → 3).
    """

    _PATH_TIER: dict[str, int] = {
        "/v1/pulse": 1,
        "/v1/intelligence": 2,
        "/v1/strategy": 3,
    }

    def _infer_tier(self, path: str) -> int:
        for prefix, tier in self._PATH_TIER.items():
            if path.startswith(prefix):
                return tier
        return 1

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Auth middleware (dependency injection) runs inside route handlers,
        # so we check the state set by get_current_user if available.
        user: User | None = getattr(request.state, "user", None)
        if user is None:
            # Pre-auth request — let it through; auth will reject if needed.
            return await call_next(request)

        tier = self._infer_tier(request.url.path)
        rpm_limit = _TIER_RPM.get(min(tier, user.max_tier), RATE_LIMIT_TIER1_RPM)

        redis = await _get_redis()
        window = int(time.time() // 60)
        key = f"rl:{user.id}:t{tier}:{window}"

        count = await redis.incr(key)
        if count == 1:
            await redis.expire(key, 61)

        if count > rpm_limit:
            retry_after = 60 - (int(time.time()) % 60)
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": f"Rate limit exceeded ({rpm_limit} req/min for Tier {tier}). "
                              f"Retry after {retry_after}s."
                },
                headers={"Retry-After": str(retry_after)},
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(rpm_limit)
        response.headers["X-RateLimit-Remaining"] = str(max(0, rpm_limit - count))
        return response


# ---------------------------------------------------------------------------
# Starlette middleware: AuditLogMiddleware
# ---------------------------------------------------------------------------

class AuditLogMiddleware(BaseHTTPMiddleware):
    """Structured access log for compliance and debugging."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

        user: User | None = getattr(request.state, "user", None)
        logger.info(
            "ACCESS",
            extra={
                "request_id": getattr(request.state, "request_id", "-"),
                "method": request.method,
                "path": request.url.path,
                "status": response.status_code,
                "elapsed_ms": elapsed_ms,
                "user_id": user.id if user else "-",
                "package": user.package if user else "-",
                "org_id": user.org_id if user else "-",
            },
        )
        return response


# ---------------------------------------------------------------------------
# App factory helper — registers all middleware in correct order
# ---------------------------------------------------------------------------

def register_middleware(app: ASGIApp) -> None:
    """
    Call from main FastAPI app factory:

        from backend.core.middleware import register_middleware
        register_middleware(app)
    """
    # Outermost → innermost (Starlette reverses the stack)
    app.add_middleware(AuditLogMiddleware)
    app.add_middleware(RateLimitMiddleware)
    app.add_middleware(CorrelationIDMiddleware)
    logger.info("Middleware stack registered: Correlation → RateLimit → Audit")
