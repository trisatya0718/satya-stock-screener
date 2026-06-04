"""Endpoint detail saham & valuasi."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.core.universe import get_emiten
from app.data import cache

router = APIRouter(prefix="/api/stocks", tags=["stocks"])


def _detail(a: dict) -> dict:
    return {
        "code": a["code"],
        "name": a["name"],
        "sector": a["sector"],
        "is_bank": a["is_bank"],
        "price": a.get("price"),
        "change_pct": a.get("change_pct"),
        "score": a.get("score", 0),
        "grade": a.get("grade", "E"),
        "dupont": a.get("dupont") or {},
        "bank_metrics": a.get("bank_metrics"),
        "ratios": a.get("per_period") or [],
        "valuation": a.get("valuation") or {},
        "updated_at": a.get("_updated_at"),
    }


@router.get("/{code}")
def stock_detail(code: str):
    a = cache.get_emiten(code)
    if not a:
        if not get_emiten(code):
            raise HTTPException(404, f"Emiten {code} tidak ada di universe")
        raise HTTPException(404, f"Data {code} belum di-refresh. Jalankan POST /api/refresh.")
    return _detail(a)


@router.get("/{code}/valuation")
def stock_valuation(code: str):
    a = cache.get_emiten(code)
    if not a:
        raise HTTPException(404, f"Data {code} belum tersedia. Jalankan POST /api/refresh.")
    return a.get("valuation") or {}


@router.get("/{code}/price-history")
def stock_price_history(code: str):
    a = cache.get_emiten(code)
    if not a:
        raise HTTPException(404, f"Data {code} belum tersedia.")
    return {"code": code.upper(), "history": a.get("price_history") or []}
