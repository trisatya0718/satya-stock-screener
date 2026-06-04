"""Entry point FastAPI untuk Stock Screener IDX."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import market, refresh, screener, stocks
from app.core.config import FRONTEND_ORIGINS
from app.data import cache

app = FastAPI(title="IDX Stock Screener API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(market.router)
app.include_router(screener.router)
app.include_router(stocks.router)
app.include_router(refresh.router)


@app.on_event("startup")
def _startup() -> None:
    cache.init_db()


@app.get("/api/health")
def health():
    return {"status": "ok", "cached_emiten": cache.count_emiten(),
            "last_refresh": cache.get_meta("last_refresh")}
