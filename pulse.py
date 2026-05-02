"""
pulse.py — Tier 1 API: Real-time signal alerts.

Exposes:
  GET  /v1/pulse/alerts          → latest pre-viral & breakout signals
  GET  /v1/pulse/live            → SSE stream of incoming signals
  GET  /v1/pulse/signal/{id}     → single signal detail
  POST /v1/pulse/subscribe       → webhook subscription for alert push
  GET  /v1/pulse/geo             → geo-velocity snapshot for PulseGlobe
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Annotated, AsyncGenerator

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from backend.core.middleware import require_tier, get_current_user, User
from backend.database import vector_store
from shared.constants import (
    REDIS_URL,
    REDIS_CHANNEL_SIGNALS,
    VIRAL_VELOCITY_THRESHOLD,
    MAX_ALERT_RESULTS,
)
from shared.schemas import Signal, SignalCategory

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/v1/pulse", tags=["Pulse — Tier 1"])

# ---------------------------------------------------------------------------
# Redis helper
# ---------------------------------------------------------------------------

_redis: aioredis.Redis | None = None


async def _get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(REDIS_URL, decode_responses=True)
    return _redis


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------

class AlertItem(BaseModel):
    signal_id: str
    title: str
    source: str
    category: str
    region: str
    velocity_score: float
    pre_viral: bool
    timestamp_ms: int
    similarity_cluster: list[str] = []


class AlertsResponse(BaseModel):
    total: int
    threshold: float
    alerts: list[AlertItem]


class GeoSnapshot(BaseModel):
    region: str
    active_signals: int
    avg_velocity: float
    top_topic: str


class WebhookSubscription(BaseModel):
    url: str
    secret: str
    categories: list[SignalCategory] = []
    min_velocity: float = VIRAL_VELOCITY_THRESHOLD


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/alerts", response_model=AlertsResponse, summary="Latest pre-viral alerts")
async def get_alerts(
    limit: Annotated[int, Query(ge=1, le=100)] = MAX_ALERT_RESULTS,
    category: SignalCategory | None = None,
    region: str | None = None,
    min_velocity: float = VIRAL_VELOCITY_THRESHOLD,
    _user: User = Depends(require_tier(1)),
):
    """
    Return the most recent signals whose velocity_score exceeds
    `min_velocity`.  Supports optional filtering by category and region.

    Access: Tier 1+
    """
    redis = await _get_redis()

    # Pull latest signals from Redis sorted set (score = velocity)
    raw = await redis.zrevrangebyscore(
        "signals:velocity",
        max="+inf",
        min=min_velocity,
        start=0,
        num=limit,
        withscores=True,
    )

    alerts: list[AlertItem] = []
    for signal_json, velocity in raw:
        try:
            data: dict = json.loads(signal_json)
        except json.JSONDecodeError:
            continue

        if category and data.get("category") != category.value:
            continue
        if region and data.get("region", "global").lower() != region.lower():
            continue

        # Enrich with narrative cluster siblings from vector store
        similar = vector_store.find_similar_signals(
            query=data.get("title", ""),
            n_results=5,
            where={"category": data.get("category", "")},
        )
        cluster_ids = [
            h["metadata"]["signal_id"]
            for h in similar
            if h["metadata"].get("signal_id") != data.get("id")
            and h["distance"] < 0.25
        ]

        alerts.append(
            AlertItem(
                signal_id=data.get("id", ""),
                title=data.get("title", ""),
                source=data.get("source", ""),
                category=data.get("category", ""),
                region=data.get("region", "global"),
                velocity_score=round(velocity, 4),
                pre_viral=velocity >= VIRAL_VELOCITY_THRESHOLD,
                timestamp_ms=data.get("timestamp_ms", 0),
                similarity_cluster=cluster_ids[:3],
            )
        )

    return AlertsResponse(
        total=len(alerts),
        threshold=min_velocity,
        alerts=alerts,
    )


@router.get("/signal/{signal_id}", response_model=Signal, summary="Single signal detail")
async def get_signal(
    signal_id: str,
    _user: User = Depends(require_tier(1)),
):
    """Fetch a single signal by ID from Redis.  Falls back to vector store
    metadata if the signal has aged out of the hot cache."""
    redis = await _get_redis()
    raw = await redis.hget("signal:detail", signal_id)

    if not raw:
        # Try vector store metadata
        hits = vector_store.find_similar_signals(
            query=signal_id, n_results=1,
            where={"signal_id": signal_id},
        )
        if not hits:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Signal not found")
        meta = hits[0]["metadata"]
        raw = json.dumps(meta)

    try:
        return Signal(**json.loads(raw))
    except Exception as exc:
        logger.error("Failed to parse signal %s: %s", signal_id, exc)
        raise HTTPException(status_code=500, detail="Signal parse error") from exc


@router.get("/live", summary="SSE stream of incoming signals")
async def live_stream(
    request: Request,
    _user: User = Depends(require_tier(1)),
):
    """
    Server-Sent Events stream.  Each event is a JSON-serialised Signal.
    Clients should reconnect on disconnect; the `id:` field carries the
    Redis message ID for resumption via `Last-Event-ID`.
    """
    redis = await _get_redis()

    async def _event_generator() -> AsyncGenerator[str, None]:
        last_id = request.headers.get("last-event-id", "$")
        pubsub = redis.pubsub()
        await pubsub.subscribe(REDIS_CHANNEL_SIGNALS)

        try:
            async for message in pubsub.listen():
                if await request.is_disconnected():
                    break
                if message["type"] != "message":
                    continue

                payload = message["data"]
                msg_id = message.get("pattern") or last_id  # best-effort

                yield f"id: {msg_id}\nevent: signal\ndata: {payload}\n\n"
                await asyncio.sleep(0)
        finally:
            await pubsub.unsubscribe(REDIS_CHANNEL_SIGNALS)
            await pubsub.aclose()

    return StreamingResponse(
        _event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/geo", response_model=list[GeoSnapshot], summary="Geo-velocity snapshot")
async def geo_snapshot(
    _user: User = Depends(require_tier(1)),
):
    """
    Aggregate velocity data per region — consumed by PulseGlobe.tsx.
    Returns one entry per active region in descending velocity order.
    """
    redis = await _get_redis()
    raw = await redis.hgetall("geo:snapshot")

    snapshots: list[GeoSnapshot] = []
    for region, json_blob in raw.items():
        try:
            data = json.loads(json_blob)
            snapshots.append(GeoSnapshot(**{**data, "region": region}))
        except Exception:
            continue

    return sorted(snapshots, key=lambda s: s.avg_velocity, reverse=True)


@router.post(
    "/subscribe",
    status_code=status.HTTP_201_CREATED,
    summary="Register webhook for alert push",
)
async def subscribe_webhook(
    body: WebhookSubscription,
    _user: User = Depends(require_tier(1)),
):
    """
    Register an HTTPS webhook endpoint.  Cultural Pulse will POST a
    JSON-serialised `AlertItem` whenever a matching signal crosses the
    velocity threshold.

    The `secret` is used to sign payloads via HMAC-SHA256
    (header: `X-Pulse-Signature`).
    """
    redis = await _get_redis()
    key = f"webhook:{_user.id}:{body.url}"
    await redis.hset(
        key,
        mapping={
            "url": body.url,
            "secret": body.secret,
            "categories": json.dumps([c.value for c in body.categories]),
            "min_velocity": body.min_velocity,
            "user_id": _user.id,
        },
    )
    await redis.expire(key, 60 * 60 * 24 * 90)  # 90-day TTL
    return {"status": "subscribed", "endpoint": body.url}