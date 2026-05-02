"""
intelligence.py — Tier 2 API: Heatmaps, bias spectrum & lifecycle analytics.

Exposes:
  GET  /v1/intelligence/heatmap          → bias heatmap (YT vs Trends tension)
  GET  /v1/intelligence/emotion/{topic}  → emotion pulse breakdown
  GET  /v1/intelligence/lifecycle/{id}   → trend decay / longevity prediction
  GET  /v1/intelligence/brand-safety     → toxicity shield status per trend
  GET  /v1/intelligence/narrative-graph  → narrative cluster overview (RAG)
  POST /v1/intelligence/query            → free-form RAG query over signals
"""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from backend.core.middleware import require_tier, User
from backend.database import vector_store
from intelligence.models.bias_heatmap import compute_bias_heatmap, BiasHeatmapResult
from intelligence.models.emotion_pulse import analyse_emotion, EmotionResult
from intelligence.models.brand_safety import classify_safety, SafetyResult
from intelligence.lifecycle.trend_decay import predict_lifecycle, LifecycleResult
from shared.constants import MAX_RAG_RESULTS
from shared.schemas import SignalCategory

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/v1/intelligence", tags=["Intelligence — Tier 2"])


# ---------------------------------------------------------------------------
# Response models (supplementary — core models live in intelligence/)
# ---------------------------------------------------------------------------

class NarrativeNode(BaseModel):
    node_id: str
    narrative: str
    cluster_size: int
    top_sources: list[str]
    avg_velocity: float
    similarity: float


class NarrativeGraphResponse(BaseModel):
    total_nodes: int
    nodes: list[NarrativeNode]


class RAGQueryRequest(BaseModel):
    query: str
    category: SignalCategory | None = None
    max_results: int = MAX_RAG_RESULTS


class RAGQueryResponse(BaseModel):
    query: str
    context_hits: int
    answer: str
    sources: list[dict]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/heatmap", response_model=BiasHeatmapResult, summary="Media bias heatmap")
async def get_bias_heatmap(
    topic: str | None = None,
    region: str | None = None,
    hours: Annotated[int, Query(ge=1, le=168)] = 24,
    _user: User = Depends(require_tier(2)),
):
    """
    Computes the tension score between YouTube sensationalism signals and
    Google Trends breakout data.

    - **Cool Blue** zone: Trends-dominant, low sensationalism.
    - **Hot Red** zone: High YT sensationalism, low Trends volume.
    - **Overlap** zone: Convergence — highest conversion potential.

    Access: Tier 2+
    """
    try:
        result = await compute_bias_heatmap(
            topic=topic,
            region=region,
            window_hours=hours,
        )
    except Exception as exc:
        logger.error("Heatmap compute failed: %s", exc)
        raise HTTPException(status_code=500, detail="Heatmap computation failed") from exc
    return result


@router.get(
    "/emotion/{topic}",
    response_model=EmotionResult,
    summary="Emotion pulse for a topic",
)
async def get_emotion_pulse(
    topic: str,
    source_filter: list[str] = Query(default=[]),
    _user: User = Depends(require_tier(2)),
):
    """
    NLP-based breakdown of dominant emotions (Outrage, Pride, Humor,
    Fear, Hope, Disgust) detected across signal texts for `topic`.

    `source_filter` optionally restricts to specific ingestion sources
    (e.g. `["youtube", "twitter"]`).

    Access: Tier 2+
    """
    # Pull semantically related signals from vector store for grounding
    context_hits = vector_store.find_similar_signals(
        query=topic,
        n_results=20,
        where={"source": {"$in": source_filter}} if source_filter else None,
    )
    corpus = [h["document"] for h in context_hits]

    if not corpus:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No signals found for topic '{topic}'",
        )

    result = await analyse_emotion(topic=topic, corpus=corpus)
    return result


@router.get(
    "/lifecycle/{trend_id}",
    response_model=LifecycleResult,
    summary="Trend lifecycle & decay prediction",
)
async def get_lifecycle(
    trend_id: str,
    _user: User = Depends(require_tier(2)),
):
    """
    Returns an ML-predicted lifecycle chart for the given trend:
    - Current stage (Emerging / Peak / Declining / Zombie)
    - Predicted days-to-peak and days-to-decay
    - Longevity score [0–1]

    Access: Tier 2+
    """
    try:
        result = await predict_lifecycle(trend_id=trend_id)
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trend '{trend_id}' not found",
        )
    return result


@router.get(
    "/brand-safety",
    response_model=list[SafetyResult],
    summary="Brand safety shield status",
)
async def get_brand_safety(
    topic: str | None = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
    _user: User = Depends(require_tier(2)),
):
    """
    Classifies active trends by toxicity level:
    - 🟢 **Safe** — brand-safe for all audiences
    - 🟡 **Caution** — contextual risk, requires copy review
    - 🔴 **Avoid** — high toxicity / reputational risk

    Consumed by SafetyShield.tsx.

    Access: Tier 2+
    """
    # Fetch recent trend embeddings as classification candidates
    trends = vector_store.find_related_trends(
        query=topic or "brand safety risk toxicity",
        n_results=limit,
    )

    results: list[SafetyResult] = []
    for t in trends:
        try:
            safety = await classify_safety(
                text=t["document"],
                metadata=t["metadata"],
            )
            results.append(safety)
        except Exception as exc:
            logger.warning("Safety classification failed for %s: %s", t["id"], exc)

    return sorted(results, key=lambda r: r.risk_score, reverse=True)


@router.get(
    "/narrative-graph",
    response_model=NarrativeGraphResponse,
    summary="Narrative cluster overview",
)
async def get_narrative_graph(
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    _user: User = Depends(require_tier(2)),
):
    """
    Returns the top-level narrative clusters from the vector store's
    Narrative Graph collection.  Each node aggregates semantically similar
    signals into a single coherent narrative thread.

    Access: Tier 2+
    """
    raw_nodes = vector_store.list_narrative_nodes(limit=limit)

    nodes = []
    for n in raw_nodes:
        meta = n.get("metadata", {})
        nodes.append(
            NarrativeNode(
                node_id=n["node_id"],
                narrative=n["narrative"],
                cluster_size=meta.get("cluster_size", 1),
                top_sources=meta.get("top_sources", []),
                avg_velocity=meta.get("avg_velocity", 0.0),
                similarity=meta.get("similarity", 1.0),
            )
        )

    return NarrativeGraphResponse(total_nodes=len(nodes), nodes=nodes)


@router.post(
    "/query",
    response_model=RAGQueryResponse,
    summary="RAG query over signal corpus",
)
async def rag_query(
    body: RAGQueryRequest,
    _user: User = Depends(require_tier(2)),
):
    """
    Free-form semantic query over the full signal + narrative corpus.
    The backend retrieves the top-k most relevant signal documents and
    passes them as RAG context to the insight_worker's LLM call.

    Access: Tier 2+
    """
    where = {"category": body.category.value} if body.category else None

    signal_hits = vector_store.find_similar_signals(
        query=body.query,
        n_results=body.max_results,
        where=where,
    )
    narrative_ctx = vector_store.get_narrative_context(
        query=body.query,
        n_results=5,
    )

    if not signal_hits and not narrative_ctx:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No relevant signals found for query",
        )

    # Compose context blob — insight_worker handles the actual LLM call
    from intelligence.workers.insight_worker import run_rag_query  # local import avoids circular dep
    answer = await run_rag_query(
        query=body.query,
        signal_docs=[h["document"] for h in signal_hits],
        narrative_docs=[n["narrative"] for n in narrative_ctx],
    )

    return RAGQueryResponse(
        query=body.query,
        context_hits=len(signal_hits) + len(narrative_ctx),
        answer=answer,
        sources=[
            {
                "id": h["id"],
                "source": h["metadata"].get("source"),
                "distance": round(h["distance"], 4),
            }
            for h in signal_hits[:5]
        ],
    )