"""Shared runtime constants for Cultural Pulse services."""

from __future__ import annotations

import os


def _env(name: str, default: str) -> str:
    value = os.getenv(name)
    return value if value is not None and value != "" else default


def _env_int(name: str, default: int) -> int:
    try:
        return int(_env(name, str(default)))
    except ValueError:
        return default


def _env_float(name: str, default: float) -> float:
    try:
        return float(_env(name, str(default)))
    except ValueError:
        return default


def _env_bool(name: str, default: bool) -> bool:
    return _env(name, "1" if default else "0").strip().lower() in {"1", "true", "yes", "on"}


# Auth / middleware
JWT_SECRET = _env("JWT_SECRET", "dev-only-jwt-secret")
JWT_ALGORITHM = _env("JWT_ALGORITHM", "HS256")
ALLOW_ANON_AUTH = _env_bool("ALLOW_ANON_AUTH", True)

# Redis / messaging
REDIS_URL = _env("REDIS_URL", "redis://redis:6379")
REDIS_CHANNEL_SIGNALS = _env("REDIS_CHANNEL_SIGNALS", "alerts:pre_viral")

# Rate limits (req/min)
RATE_LIMIT_TIER1_RPM = _env_int("RATE_LIMIT_TIER1_RPM", 120)
RATE_LIMIT_TIER2_RPM = _env_int("RATE_LIMIT_TIER2_RPM", 240)
RATE_LIMIT_TIER3_RPM = _env_int("RATE_LIMIT_TIER3_RPM", 480)

# Pulse / retrieval defaults
VIRAL_VELOCITY_THRESHOLD = _env_float("VIRAL_VELOCITY_THRESHOLD", 70.0)
MAX_ALERT_RESULTS = _env_int("MAX_ALERT_RESULTS", 50)
MAX_RAG_RESULTS = _env_int("MAX_RAG_RESULTS", 20)
BRIEF_CACHE_TTL_S = _env_int("BRIEF_CACHE_TTL_S", 3600)

# Vector store
CHROMA_HOST = _env("CHROMA_HOST", "localhost")
CHROMA_PORT = _env_int("CHROMA_PORT", 8000)
CHROMA_PERSIST_DIR = _env("CHROMA_PERSIST_DIR", "./.chroma")
EMBEDDING_MODEL = _env("EMBEDDING_MODEL", "text-embedding-3-small")
NARRATIVE_SIMILARITY_THRESHOLD = _env_float("NARRATIVE_SIMILARITY_THRESHOLD", 0.35)

# Creative generation
CDN_BASE_URL = _env("CDN_BASE_URL", "https://cdn.local")
MIDJOURNEY_API_URL = _env("MIDJOURNEY_API_URL", "https://api.midjourney.local")
MIDJOURNEY_API_KEY = _env("MIDJOURNEY_API_KEY", "")
DALLE_DEFAULT_QUALITY = _env("DALLE_DEFAULT_QUALITY", "standard")
DALLE_DEFAULT_STYLE = _env("DALLE_DEFAULT_STYLE", "vivid")
CREATIVE_GENERATION_TIMEOUT_S = _env_int("CREATIVE_GENERATION_TIMEOUT_S", 120)
