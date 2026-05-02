"""
vector_store.py — ChromaDB-backed Narrative Graph store.

Responsibilities:
  - Persist signal embeddings for semantic deduplication & RAG retrieval.
  - Expose typed interfaces consumed by insight_worker, deduplicator, and
    all three API tiers (pulse / intelligence / strategy).
  - Namespace collections per signal category so cross-topic bleed is
    minimised while still allowing cross-collection similarity search.
"""

from __future__ import annotations

import hashlib
import logging
import os
import time
from typing import Any

import chromadb
from chromadb.config import Settings
from chromadb.utils import embedding_functions

from shared.schemas import Signal, Trend, Brief
from shared.constants import (
    CHROMA_HOST,
    CHROMA_PORT,
    CHROMA_PERSIST_DIR,
    EMBEDDING_MODEL,
    NARRATIVE_SIMILARITY_THRESHOLD,
    MAX_RAG_RESULTS,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Collection names
# ---------------------------------------------------------------------------
_COL_SIGNALS = "signals"
_COL_TRENDS = "trends"
_COL_BRIEFS = "briefs"
_COL_NARRATIVES = "narratives"   # merged / deduplicated narrative nodes


# ---------------------------------------------------------------------------
# Singleton client
# ---------------------------------------------------------------------------

_client: chromadb.ClientAPI | None = None
_ef: embedding_functions.EmbeddingFunction | None = None


def _get_client() -> chromadb.ClientAPI:
    global _client
    if _client is None:
        mode = os.getenv("CHROMA_MODE", "persistent").lower()
        if mode == "http":
            _client = chromadb.HttpClient(
                host=CHROMA_HOST,
                port=int(CHROMA_PORT),
                settings=Settings(anonymized_telemetry=False),
            )
            logger.info("ChromaDB → HTTP client at %s:%s", CHROMA_HOST, CHROMA_PORT)
        else:
            _client = chromadb.PersistentClient(
                path=CHROMA_PERSIST_DIR,
                settings=Settings(anonymized_telemetry=False),
            )
            logger.info("ChromaDB → persistent client at %s", CHROMA_PERSIST_DIR)
    return _client


class _SimpleHashEmbeddingFunction(embedding_functions.EmbeddingFunction):
    """Lightweight fallback embedding function using character n-gram hashing.
    No external ML dependencies required. Suitable for dev/demo use."""

    DIM = 384

    def __call__(self, input: list[str]) -> list[list[float]]:  # type: ignore[override]
        import hashlib, math
        results = []
        for text in input:
            vec = [0.0] * self.DIM
            text_lower = text.lower()
            for i in range(len(text_lower)):
                for n in (2, 3, 4):
                    gram = text_lower[i: i + n]
                    if len(gram) < n:
                        break
                    h = int(hashlib.md5(gram.encode()).hexdigest(), 16)
                    idx = h % self.DIM
                    vec[idx] += 1.0
            # L2 normalise
            norm = math.sqrt(sum(x * x for x in vec)) or 1.0
            results.append([x / norm for x in vec])
        return results


def _get_ef() -> embedding_functions.EmbeddingFunction:
    global _ef
    if _ef is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if False: # api_key:
            _ef = embedding_functions.OpenAIEmbeddingFunction(
                api_key=api_key,
                model_name=EMBEDDING_MODEL,
            )
        else:
            logger.warning(
                "OPENAI_API_KEY not set – using lightweight hash-based embeddings (dev mode)."
            )
            _ef = _SimpleHashEmbeddingFunction()
    return _ef


def _col(name: str) -> chromadb.Collection:
    return _get_client().get_or_create_collection(
        name=name,
        embedding_function=_get_ef(),
        metadata={"hnsw:space": "cosine"},
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _stable_id(text: str, prefix: str = "") -> str:
    """Deterministic SHA-256–based ID so re-ingesting the same signal is
    idempotent (Chroma upsert de-dupes by document ID)."""
    digest = hashlib.sha256(text.encode()).hexdigest()[:24]
    return f"{prefix}{digest}" if prefix else digest


def _now_ms() -> int:
    return int(time.time() * 1000)


# ---------------------------------------------------------------------------
# Public API — Signals
# ---------------------------------------------------------------------------

def upsert_signal(signal: Signal) -> str:
    """Store / update a raw signal embedding.  Returns the document ID."""
    text = f"{signal.title} {signal.description or ''} {' '.join(signal.keywords or [])}"
    doc_id = _stable_id(text, prefix="sig_")

    _col(_COL_SIGNALS).upsert(
        ids=[doc_id],
        documents=[text],
        metadatas=[{
            "signal_id": signal.id,
            "source": signal.source,
            "category": signal.category,
            "region": signal.region or "global",
            "velocity_score": signal.velocity_score,
            "timestamp_ms": signal.timestamp_ms or _now_ms(),
        }],
    )
    logger.debug("Upserted signal %s → chroma id %s", signal.id, doc_id)
    return doc_id


def find_similar_signals(
    query: str,
    n_results: int = MAX_RAG_RESULTS,
    where: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    """Semantic nearest-neighbour search over raw signals.

    Returns a list of {id, document, metadata, distance} dicts sorted by
    ascending cosine distance (most similar first).
    """
    kwargs: dict[str, Any] = {"query_texts": [query], "n_results": n_results}
    if where:
        kwargs["where"] = where

    results = _col(_COL_SIGNALS).query(**kwargs)

    hits = []
    for doc_id, doc, meta, dist in zip(
        results["ids"][0],
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0],
    ):
        hits.append({"id": doc_id, "document": doc, "metadata": meta, "distance": dist})
    return hits


# ---------------------------------------------------------------------------
# Public API — Narrative Graph
# ---------------------------------------------------------------------------

def upsert_narrative_node(
    node_id: str,
    narrative_text: str,
    metadata: dict[str, Any],
) -> None:
    """Insert or merge a narrative cluster node into the graph collection."""
    _col(_COL_NARRATIVES).upsert(
        ids=[node_id],
        documents=[narrative_text],
        metadatas=[{**metadata, "updated_ms": _now_ms()}],
    )


def get_narrative_context(
    query: str,
    n_results: int = 5,
    similarity_threshold: float = NARRATIVE_SIMILARITY_THRESHOLD,
) -> list[dict[str, Any]]:
    """Retrieve the top-k narrative nodes whose cosine distance is below the
    threshold — used by RAG in insight_worker and strategy tier."""
    results = _col(_COL_NARRATIVES).query(
        query_texts=[query],
        n_results=n_results,
    )

    context = []
    for doc_id, doc, meta, dist in zip(
        results["ids"][0],
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0],
    ):
        if dist <= similarity_threshold:
            context.append({
                "node_id": doc_id,
                "narrative": doc,
                "metadata": meta,
                "similarity": round(1 - dist, 4),
            })
    return context


def list_narrative_nodes(limit: int = 100) -> list[dict[str, Any]]:
    col = _col(_COL_NARRATIVES)
    results = col.get(limit=limit, include=["documents", "metadatas"])
    return [
        {"node_id": nid, "narrative": doc, "metadata": meta}
        for nid, doc, meta in zip(
            results["ids"], results["documents"], results["metadatas"]
        )
    ]


# ---------------------------------------------------------------------------
# Public API — Trends
# ---------------------------------------------------------------------------

def upsert_trend(trend: Trend) -> str:
    text = f"{trend.topic} {trend.summary or ''}"
    doc_id = _stable_id(text, prefix="trnd_")

    _col(_COL_TRENDS).upsert(
        ids=[doc_id],
        documents=[text],
        metadatas=[{
            "trend_id": trend.id,
            "topic": trend.topic,
            "lifecycle_stage": trend.lifecycle_stage,
            "peak_score": trend.peak_score,
            "decay_rate": trend.decay_rate,
            "timestamp_ms": trend.timestamp_ms or _now_ms(),
        }],
    )
    return doc_id


def find_related_trends(
    query: str,
    n_results: int = MAX_RAG_RESULTS,
) -> list[dict[str, Any]]:
    results = _col(_COL_TRENDS).query(query_texts=[query], n_results=n_results)
    return [
        {"id": i, "document": d, "metadata": m, "distance": dist}
        for i, d, m, dist in zip(
            results["ids"][0],
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        )
    ]


# ---------------------------------------------------------------------------
# Public API — Briefs
# ---------------------------------------------------------------------------

def store_brief(brief: Brief) -> str:
    text = f"{brief.headline} {brief.body}"
    doc_id = _stable_id(text, prefix="brief_")

    _col(_COL_BRIEFS).upsert(
        ids=[doc_id],
        documents=[text],
        metadatas=[{
            "brief_id": brief.id,
            "tier": brief.tier,
            "generated_ms": brief.generated_ms or _now_ms(),
        }],
    )
    return doc_id


def retrieve_past_briefs(
    query: str,
    n_results: int = 3,
) -> list[dict[str, Any]]:
    results = _col(_COL_BRIEFS).query(query_texts=[query], n_results=n_results)
    return [
        {"id": i, "document": d, "metadata": m}
        for i, d, m in zip(
            results["ids"][0],
            results["documents"][0],
            results["metadatas"][0],
        )
    ]


# ---------------------------------------------------------------------------
# Maintenance
# ---------------------------------------------------------------------------

def delete_signal(doc_id: str) -> None:
    _col(_COL_SIGNALS).delete(ids=[doc_id])


def purge_stale_signals(older_than_ms: int) -> int:
    """Delete signal embeddings whose timestamp_ms is older than the given
    epoch-millisecond cutoff.  Returns the count of deleted documents."""
    col = _col(_COL_SIGNALS)
    results = col.get(
        where={"timestamp_ms": {"$lt": older_than_ms}},
        include=["metadatas"],
    )
    ids_to_delete = results["ids"]
    if ids_to_delete:
        col.delete(ids=ids_to_delete)
        logger.info("Purged %d stale signal embeddings", len(ids_to_delete))
    return len(ids_to_delete)


def collection_stats() -> dict[str, int]:
    client = _get_client()
    return {
        name: client.get_collection(name).count()
        for name in [_COL_SIGNALS, _COL_TRENDS, _COL_BRIEFS, _COL_NARRATIVES]
        if any(c.name == name for c in client.list_collections())
    }