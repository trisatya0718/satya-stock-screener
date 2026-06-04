"""Endpoint screener: daftar emiten dengan skor & rasio, bisa difilter/sort."""
from __future__ import annotations

from fastapi import APIRouter, Query

from app.data import cache

router = APIRouter(prefix="/api", tags=["screener"])

_SORT_KEYS = {"score", "roe", "upside_pct", "price", "change_pct", "per", "pbv", "code"}


def _to_row(a: dict) -> dict:
    headline = a.get("headline") or {}
    val = a.get("valuation") or {}
    return {
        "code": a["code"],
        "name": a["name"],
        "sector": a["sector"],
        "is_bank": a["is_bank"],
        "price": a.get("price"),
        "change_pct": a.get("change_pct"),
        "score": a.get("score", 0),
        "grade": a.get("grade", "E"),
        "roe": headline.get("roe"),
        "roa": headline.get("roa"),
        "npm": headline.get("npm"),
        "revenue_growth": a.get("revenue_growth"),
        "earnings_growth": a.get("earnings_growth"),
        "per": val.get("per"),
        "pbv": val.get("pbv"),
        "upside_pct": val.get("upside_pct"),
        "hold_years": val.get("hold_years"),
        "verdict": val.get("verdict"),
    }


@router.get("/screener")
def screener(
    min_score: float = Query(0, ge=0, le=100),
    sector: str | None = None,
    bank: bool | None = None,
    sort: str = "score",
    desc: bool = True,
    limit: int = Query(100, ge=1, le=200),
):
    rows = [_to_row(a) for a in cache.get_all_emiten()]
    rows = [r for r in rows if (r["score"] or 0) >= min_score]
    if sector:
        rows = [r for r in rows if r["sector"].lower() == sector.lower()]
    if bank is not None:
        rows = [r for r in rows if r["is_bank"] == bank]

    key = sort if sort in _SORT_KEYS else "score"
    if key == "code":
        rows.sort(key=lambda r: r["code"], reverse=desc)
    else:
        # nilai None selalu di paling bawah, apa pun arah sortir
        sentinel = float("-inf") if desc else float("inf")
        rows.sort(key=lambda r: r.get(key) if r.get(key) is not None else sentinel, reverse=desc)
    rows = rows[:limit]
    return {"rows": rows, "count": len(rows), "updated_at": cache.get_meta("last_refresh")}
