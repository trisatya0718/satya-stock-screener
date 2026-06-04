"""Endpoint data pasar: IHSG & ringkasan pasar."""
from __future__ import annotations

import json

from fastapi import APIRouter

from app.core.config import IHSG_SYMBOL
from app.data import cache
from app.data.providers.yfinance_provider import YFinanceProvider

router = APIRouter(prefix="/api/market", tags=["market"])
provider = YFinanceProvider()


def _load_ihsg_history() -> list[dict]:
    raw = cache.get_meta("ihsg_history")
    if raw:
        return json.loads(raw)
    # belum ada cache -> ambil live
    hist = provider.get_index_history(IHSG_SYMBOL, period="1y")
    if hist:
        cache.set_meta("ihsg_history", json.dumps(hist))
    return hist


@router.get("/ihsg")
def get_ihsg():
    hist = _load_ihsg_history()
    if not hist:
        return {"symbol": IHSG_SYMBOL, "last": 0, "change": 0, "change_pct": 0,
                "prev_close": 0, "history": [], "updated_at": cache.get_meta("last_refresh")}
    last = hist[-1]["close"]
    prev = hist[-2]["close"] if len(hist) > 1 else last
    change = last - prev
    change_pct = (change / prev * 100) if prev else 0
    return {
        "symbol": IHSG_SYMBOL,
        "last": round(last, 2),
        "change": round(change, 2),
        "change_pct": round(change_pct, 2),
        "prev_close": round(prev, 2),
        "history": hist,
        "updated_at": cache.get_meta("last_refresh"),
    }


@router.get("/overview")
def get_overview():
    rows = cache.get_all_emiten()
    adv = sum(1 for r in rows if (r.get("change_pct") or 0) > 0)
    dec = sum(1 for r in rows if (r.get("change_pct") or 0) < 0)
    unc = len(rows) - adv - dec
    scores = [r.get("score") for r in rows if r.get("score") is not None]
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0

    hist = _load_ihsg_history()
    ihsg_last = round(hist[-1]["close"], 2) if hist else 0
    ihsg_change_pct = 0.0
    if len(hist) > 1 and hist[-2]["close"]:
        ihsg_change_pct = round((hist[-1]["close"] - hist[-2]["close"]) / hist[-2]["close"] * 100, 2)

    return {
        "ihsg_last": ihsg_last,
        "ihsg_change_pct": ihsg_change_pct,
        "advancers": adv,
        "decliners": dec,
        "unchanged": unc,
        "avg_score": avg_score,
        "total_emiten": len(rows),
        "updated_at": cache.get_meta("last_refresh"),
    }
