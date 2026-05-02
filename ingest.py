"""
ingest.py — Ingestion Control API.

Exposes:
  POST /v1/ingest/seed      → seed Redis with sample signals for dev/demo
  POST /v1/ingest/scrape    → trigger a live Google Trends scrape
  GET  /v1/ingest/status    → ingestion pipeline status
"""

from __future__ import annotations

import json
import logging
import time
import uuid

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends

from backend.core.middleware import require_tier, User
from backend.database import vector_store
from shared.constants import REDIS_URL
from shared.schemas import Signal, Trend

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/v1/ingest", tags=["Ingestion Control"])

_redis: aioredis.Redis | None = None


async def _get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(REDIS_URL, decode_responses=True)
    return _redis


SAMPLE_SIGNALS = [
    {
        "id": "sig_001", "title": "CAN 2026 — Sélection Tunisie en route vers la qualification",
        "source": "GOOGLE_TRENDS", "category": "sports", "region": "TN",
        "velocity_score": 91.2, "pre_viral": True, "keywords": ["CAN2026", "Tunisie", "football"],
        "term": "CAN 2026 Tunisie", "timestamp": "", "traffic": "500K+",
        "description": "Tunisian national team qualification buzz",
        "yt": {
            "signal_id": "sig_001", "title": "CAN 2026 TUNISIE : Analyse SHOCKING des adversaires!",
            "thumbnail_text": "BREAKING EXCLUSIVE", "channel": "SportTN", "view_count": 320000,
            "timestamp": time.time(),
        },
        "trends": {
            "signal_id": "sig_001", "topic": "CAN 2026 Tunisie", "breakout_score": 92,
            "related_queries": ["can 2026", "tunisie football", "qualification africaine"],
            "geo": "TN", "timestamp": time.time(),
        },
        "social": {
            "signal_id": "sig_001", "topic": "CAN 2026 Tunisie",
            "caption": "La Fédération Tunisienne de Football annonce le programme de qualification CAN 2026.",
            "comment_sample": ["Allez les Aigles!", "Fier d'être Tunisien!", "Espoir pour 2026", "On va qualifier inch'allah"],
            "account_names": ["FTF", "MosaiqueFM", "Jawhara"], "timestamp": time.time(),
        },
    },
    {
        "id": "sig_002", "title": "Élections présidentielles 2024 — résultats et analyses",
        "source": "RS_MEDIA", "category": "politics", "region": "TN",
        "velocity_score": 84.7, "pre_viral": True, "keywords": ["élections", "politique", "Tunisie"],
        "term": "Élections présidentielles", "timestamp": "", "traffic": "200K+",
        "description": "Post-election political analysis",
        "yt": {
            "signal_id": "sig_002", "title": "EXPOSED: Vérité sur les Élections — Ce qu'on ne vous dit pas!",
            "thumbnail_text": "BANNED CENSORED MUST WATCH", "channel": "TruthTN", "view_count": 180000,
            "timestamp": time.time(),
        },
        "trends": {
            "signal_id": "sig_002", "topic": "Élections présidentielles 2024", "breakout_score": 75,
            "related_queries": ["résultats élections", "candidats présidentielle", "vote tunisie"],
            "geo": "TN", "timestamp": time.time(),
        },
        "social": {
            "signal_id": "sig_002", "topic": "Élections présidentielles 2024",
            "caption": "Résultats officiels des élections présidentielles publiés par l'ISIE.",
            "comment_sample": ["Résultats contestés!", "Processus démocratique", "Transparence requise", "Honte!"],
            "account_names": ["ISIE", "TAP", "Kapitalis"], "timestamp": time.time(),
        },
    },
    {
        "id": "sig_003", "title": "Startup Tunisie — levée de fonds record dans la Tech",
        "source": "GOOGLE_TRENDS", "category": "tech", "region": "TN",
        "velocity_score": 76.3, "pre_viral": False, "keywords": ["startup", "tech", "investissement"],
        "term": "Startup Tunisia Tech", "timestamp": "", "traffic": "50K+",
        "description": "Tunisian tech startup funding milestone",
        "yt": {
            "signal_id": "sig_003", "title": "La startup tunisienne qui révolutionne la fintech africaine",
            "thumbnail_text": "Innovation Africa", "channel": "TechTN", "view_count": 45000,
            "timestamp": time.time(),
        },
        "trends": {
            "signal_id": "sig_003", "topic": "Startup Tunisie fintech", "breakout_score": 55,
            "related_queries": ["fintech tunisie", "startup africa", "investissement tech"],
            "geo": "TN", "timestamp": time.time(),
        },
        "social": {
            "signal_id": "sig_003", "topic": "Startup Tunisie fintech",
            "caption": "Une startup tunisienne lève 5M$ pour révolutionner les paiements mobiles en Afrique.",
            "comment_sample": ["Bravo!", "Fierté nationale", "Excellent projet", "Futur prometteur pour la tech TN"],
            "account_names": ["TechTN", "Startup Magazine", "L'Economiste"], "timestamp": time.time(),
        },
    },
    {
        "id": "sig_004", "title": "Ramadan 2025 — tendances consommation et publicité",
        "source": "RS_MEDIA", "category": "culture", "region": "MENA",
        "velocity_score": 88.1, "pre_viral": True, "keywords": ["ramadan", "consommation", "MENA"],
        "term": "Ramadan 2025 MENA", "timestamp": "", "traffic": "1M+",
        "description": "Ramadan consumer trends and ad strategies",
        "yt": {
            "signal_id": "sig_004", "title": "Ramadan 2025 : les tendances pub qui vont DOMINER!",
            "thumbnail_text": "SHOCKING tendances publicité", "channel": "MarketingArab", "view_count": 890000,
            "timestamp": time.time(),
        },
        "trends": {
            "signal_id": "sig_004", "topic": "Ramadan 2025 publicité", "breakout_score": 88,
            "related_queries": ["ramadan ads 2025", "مسلسلات رمضان", "ramadan marketing mena"],
            "geo": "MENA", "timestamp": time.time(),
        },
        "social": {
            "signal_id": "sig_004", "topic": "Ramadan 2025 MENA",
            "caption": "Les marques préparent leurs campagnes Ramadan 2025 avec un budget en hausse de 40%.",
            "comment_sample": ["Ramadan kareem!", "Opportunité pour les marques", "Fond publicitaire immense", "Belle période"],
            "account_names": ["MosaiqueFM", "Al Arabiya", "Forbes ME"], "timestamp": time.time(),
        },
    },
    {
        "id": "sig_005", "title": "Crise eau Tunisie — alerte sécheresse estivale",
        "source": "GOOGLE_TRENDS", "category": "general", "region": "TN",
        "velocity_score": 79.5, "pre_viral": True, "keywords": ["eau", "sécheresse", "crise"],
        "term": "Crise eau Tunisie", "timestamp": "", "traffic": "100K+",
        "description": "Water scarcity alert in Tunisia",
        "yt": {
            "signal_id": "sig_005", "title": "ALERTE : La Tunisie va manquer d'eau cet été — VÉRITÉ CACHÉE",
            "thumbnail_text": "URGENT DANGER CRISIS", "channel": "EcoTN", "view_count": 210000,
            "timestamp": time.time(),
        },
        "trends": {
            "signal_id": "sig_005", "topic": "Crise eau Tunisie sécheresse", "breakout_score": 79,
            "related_queries": ["pénurie eau", "sécheresse tunisie", "restriction eau été"],
            "geo": "TN", "timestamp": time.time(),
        },
        "social": {
            "signal_id": "sig_005", "topic": "Crise eau Tunisie",
            "caption": "Le Ministère de l'Agriculture annonce des restrictions d'eau dans 5 gouvernorats.",
            "comment_sample": ["Catastrophe!", "Gouvernement incompétent", "On souffre déjà", "Situation critique"],
            "account_names": ["Min Agriculture", "TAP", "Nawaat"], "timestamp": time.time(),
        },
    },
]

GEO_SNAPSHOTS = {
    "Tunis": {"active_signals": 3, "avg_velocity": 87.4, "top_topic": "CAN 2026 Tunisie"},
    "Sfax": {"active_signals": 2, "avg_velocity": 74.2, "top_topic": "Crise eau Tunisie"},
    "Sousse": {"active_signals": 2, "avg_velocity": 71.8, "top_topic": "Startup fintech"},
    "Nabeul": {"active_signals": 1, "avg_velocity": 68.5, "top_topic": "Ramadan 2025"},
    "MENA": {"active_signals": 4, "avg_velocity": 85.6, "top_topic": "Ramadan 2025 MENA"},
    "International": {"active_signals": 2, "avg_velocity": 76.3, "top_topic": "Tech Tunisie"},
}


@router.post("/seed", summary="Seed Redis with sample signals")
async def seed_signals(
    _user: User = Depends(require_tier(1)),
):
    r = await _get_redis()
    ts_ms = int(time.time() * 1000)
    count = 0

    for sig in SAMPLE_SIGNALS:
        sig_copy = {**sig, "timestamp": "", "timestamp_ms": ts_ms}
        signal_json = json.dumps(sig_copy)
        velocity = sig["velocity_score"]

        await r.zadd("signals:velocity", {signal_json: velocity})
        from shared.constants import REDIS_CHANNEL_SIGNALS
        await r.publish(REDIS_CHANNEL_SIGNALS, signal_json)

        detail = {
            "id": sig["id"], "title": sig["title"], "source": sig["source"],
            "category": sig["category"], "region": sig["region"],
            "velocity_score": velocity, "pre_viral": str(sig["pre_viral"]).lower(),
            "timestamp_ms": ts_ms, "keywords": json.dumps(sig["keywords"]),
        }
        await r.hset("signal:detail", sig["id"], json.dumps(detail))

        if sig.get("yt"):
            await r.set(f"signal:{sig['id']}:yt", json.dumps(sig["yt"]), ex=86400)
        if sig.get("trends"):
            await r.set(f"signal:{sig['id']}:trends", json.dumps(sig["trends"]), ex=86400)
        if sig.get("social"):
            await r.set(f"signal:{sig['id']}:social", json.dumps(sig["social"]), ex=86400)

        try:
            signal_obj = Signal(
                id=sig["id"], title=sig["title"], source=sig["source"],
                category=sig["category"], region=sig["region"],
                velocity_score=sig["velocity_score"], timestamp_ms=ts_ms,
                keywords=sig.get("keywords", []),
                description=sig.get("description", ""),
                term=sig.get("term", sig["title"]),
            )
            vector_store.upsert_signal(signal_obj)
        except Exception as exc:
            logger.warning("Vector store upsert failed for %s: %s", sig["id"], exc)

        velocity_history = {}
        for i in range(12):
            t = time.time() - (11 - i) * 3600
            v = max(0, velocity * (0.4 + 0.6 * (i / 11)) + (i % 3) * 2)
            velocity_history[str(t)] = v
        await r.zadd(f"velocity:{sig['term']}:history",
                     {str(v): float(t)
                      for t, v in velocity_history.items()})
        
        # Seed narrative node for intelligence page
        try:
            from shared.schemas import NarrativeNode
            node = NarrativeNode(
                node_id=f"node_{sig['id']}",
                narrative=sig["title"],
                cluster_size=1,
                top_sources=[sig["source"]],
                avg_velocity=velocity,
                similarity=1.0,
                timestamp_ms=ts_ms
            )
            vector_store.upsert_narrative_node(node)
        except Exception as exc:
            logger.warning("Narrative node upsert failed for %s: %s", sig["id"], exc)
            
        count += 1

    for region, snap in GEO_SNAPSHOTS.items():
        await r.hset("geo:snapshot", region, json.dumps(snap))

    # Seed trend data into vector store so brand-safety endpoint has documents
    trend_seeds = [
        Trend(id="trnd_001", topic="CAN 2026 Tunisie", summary="Tunisian national team qualification buzz, football fervour", lifecycle_stage="peak", peak_score=0.92, decay_rate=0.001, timestamp_ms=int(time.time()*1000)),
        Trend(id="trnd_002", topic="Startup Tech Tunisie", summary="Tunisian tech startup funding round, investor confidence", lifecycle_stage="accelerating", peak_score=0.78, decay_rate=0.002, timestamp_ms=int(time.time()*1000)),
        Trend(id="trnd_003", topic="Crise eau Tunisie", summary="Water scarcity alert, drought, critical infrastructure", lifecycle_stage="declining", peak_score=0.75, decay_rate=0.01, timestamp_ms=int(time.time()*1000)),
        Trend(id="trnd_004", topic="Ramadan publicité", summary="Ramadan advertising frenzy, brand spending peak", lifecycle_stage="fading", peak_score=0.65, decay_rate=0.02, timestamp_ms=int(time.time()*1000)),
        Trend(id="trnd_005", topic="AI regulation Tunisia", summary="Artificial intelligence policy debate, regulatory risk", lifecycle_stage="emerging", peak_score=0.55, decay_rate=0.0, timestamp_ms=int(time.time()*1000)),
    ]
    for tr in trend_seeds:
        try:
            vector_store.upsert_trend(tr)
        except Exception as exc:
            logger.warning("Trend vector upsert failed for %s: %s", tr.id, exc)

    return {"seeded": count, "regions": len(GEO_SNAPSHOTS), "status": "ok"}


@router.get("/status", summary="Ingestion pipeline status")
async def ingest_status(
    _user: User = Depends(require_tier(1)),
):
    r = await _get_redis()
    signal_count = await r.zcard("signals:velocity")
    geo_count = len(await r.hkeys("geo:snapshot"))
    latest_bias = await r.get("bias:latest")
    latest_lifecycle = await r.get("lifecycle:latest")

    return {
        "signals_in_redis": signal_count,
        "geo_regions": geo_count,
        "latest_bias_signal": latest_bias,
        "latest_lifecycle_signal": latest_lifecycle,
        "status": "online",
    }


@router.post("/scrape", summary="Trigger live Google Trends scrape")
async def trigger_scrape(
    _user: User = Depends(require_tier(1)),
):
    """
    Scrape Google Trends RSS for Tunisia (geo=TN).
    Falls back to synthetic MENA pulse data if the feed is unreachable.
    """
    import asyncio
    import random

    # --- attempt live RSS ---
    live_entries: list[dict] = []
    try:
        import feedparser

        def _fetch():
            feed = feedparser.parse(
                "https://trends.google.com/trending/rss?geo=TN",
                request_headers={"User-Agent": "Mozilla/5.0"},
            )
            return feed.entries[:10]

        raw = await asyncio.wait_for(
            asyncio.get_event_loop().run_in_executor(None, _fetch),
            timeout=8,
        )
        for e in raw:
            title = e.get("title", "").strip()
            if not title:
                continue
            traffic_raw = e.get("ht_approx_traffic", "1K")
            # parse e.g. "500K+" → 500000
            traffic_str = traffic_raw.replace("+", "").replace(",", "").strip()
            if traffic_str.upper().endswith("M"):
                traffic_num = float(traffic_str[:-1]) * 1_000_000
            elif traffic_str.upper().endswith("K"):
                traffic_num = float(traffic_str[:-1]) * 1_000
            else:
                traffic_num = float(traffic_str) if traffic_str.isdigit() else 5_000
            velocity = round(min(97, 55 + min(40, traffic_num / 25_000)), 1)
            live_entries.append({
                "title": title,
                "description": e.get("summary", e.get("description", "")),
                "traffic": traffic_raw,
                "velocity": velocity,
            })
        logger.info("Google Trends RSS returned %d entries", len(live_entries))
    except Exception as exc:
        logger.warning("Google Trends RSS unavailable (%s) — using synthetic pulse", exc)

    # --- synthetic fallback pool (refreshed on every call with slight randomisation) ---
    _SYNTHETIC_POOL = [
        {"title": "CAN 2026 — Résultats qualifs Tunisie",     "category": "sports",        "region": "TN",            "v_base": 93.0},
        {"title": "Présidentielles 2025 — sondage TNS",       "category": "politics",      "region": "TN",            "v_base": 88.5},
        {"title": "BFM Africa — lancement officiel",          "category": "media",         "region": "MENA",          "v_base": 82.0},
        {"title": "Fintech Tunisie — levée de fonds BIAT",    "category": "economy",       "region": "TN-TUN",        "v_base": 79.3},
        {"title": "Festival International de Carthage 2025",  "category": "culture",       "region": "Tunis",         "v_base": 76.0},
        {"title": "Grève SNCFT — perturbations trains",       "category": "politics",      "region": "TN",            "v_base": 74.2},
        {"title": "Ramadan 2026 — dates officielles",         "category": "culture",       "region": "MENA",          "v_base": 71.5},
        {"title": "Inflation Tunisie — hausse prix carburant", "category": "economy",      "region": "TN",            "v_base": 68.8},
        {"title": "Startup Sfax — YC batch automne 2025",     "category": "tech",          "region": "Sfax",          "v_base": 66.1},
        {"title": "Climat — canicule record Tunis",           "category": "general",       "region": "Tunis",         "v_base": 63.4},
    ]

    r = await _get_redis()
    ts_ms = int(time.time() * 1000)
    scraped = 0

    if live_entries:
        # use real RSS data
        source_tag = "GOOGLE_TRENDS"
        for item in live_entries:
            sig_id = f"gt_{uuid.uuid4().hex[:8]}"
            sig = {
                "id": sig_id, "title": item["title"],
                "source": source_tag, "category": "general", "region": "TN",
                "velocity_score": item["velocity"], "pre_viral": item["velocity"] >= 75,
                "timestamp_ms": ts_ms,
                "keywords": item["title"].lower().split()[:5],
                "description": item.get("description", ""),
                "term": item["title"], "traffic": item.get("traffic", ""),
            }
            await r.zadd("signals:velocity", {json.dumps(sig): item["velocity"]})
            try:
                signal_obj = Signal(
                    id=sig_id, title=sig["title"], source=source_tag,
                    category=sig["category"], region=sig["region"],
                    velocity_score=sig["velocity_score"], timestamp_ms=ts_ms,
                    keywords=sig["keywords"], description=sig["description"],
                    term=sig["term"],
                )
                vector_store.upsert_signal(signal_obj)
            except Exception:
                pass
            scraped += 1
        return {"scraped": scraped, "status": "live", "source": "GOOGLE_TRENDS_TN"}

    else:
        # synthetic fallback — pick 5 random from pool, jitter velocity
        picks = random.sample(_SYNTHETIC_POOL, k=min(5, len(_SYNTHETIC_POOL)))
        for item in picks:
            sig_id = f"syn_{uuid.uuid4().hex[:8]}"
            velocity = round(min(97, item["v_base"] + random.uniform(-3, 4)), 1)
            sig = {
                "id": sig_id, "title": item["title"],
                "source": "SYNTHETIC_PULSE", "category": item["category"], "region": item["region"],
                "velocity_score": velocity, "pre_viral": velocity >= 75,
                "timestamp_ms": ts_ms,
                "keywords": item["title"].lower().split()[:5],
                "description": f"Synthetic pulse signal: {item['title']}",
                "term": item["title"],
            }
            await r.zadd("signals:velocity", {json.dumps(sig): velocity})
            try:
                signal_obj = Signal(
                    id=sig_id, title=sig["title"], source=sig["source"],
                    category=sig["category"], region=sig["region"],
                    velocity_score=velocity, timestamp_ms=ts_ms,
                    keywords=sig["keywords"], description=sig["description"],
                    term=sig["term"],
                )
                vector_store.upsert_signal(signal_obj)
            except Exception:
                pass
            scraped += 1
        return {"scraped": scraped, "status": "synthetic", "source": "SYNTHETIC_PULSE",
                "note": "Google Trends RSS unreachable — synthetic MENA pulse injected."}
