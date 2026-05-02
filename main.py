"""Backend API entrypoint for Cultural Pulse."""

from __future__ import annotations

from fastapi import FastAPI

from backend.api.v1.pulse import router as pulse_router
from backend.api.v1.intelligence import router as intelligence_router
from backend.api.v1.strategy import router as strategy_router
from backend.api.v1.ingest import router as ingest_router
from backend.core.middleware import register_middleware


app = FastAPI(
    title="Cultural Pulse Backend",
    version="0.1.0",
    description="Unified Tier-1/2/3 API gateway.",
)

register_middleware(app)
app.include_router(pulse_router)
app.include_router(intelligence_router)
app.include_router(strategy_router)
app.include_router(ingest_router)


@app.get("/", tags=["health"])
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "backend"}
