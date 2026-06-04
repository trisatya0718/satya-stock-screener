"""Orkestrasi analisa: data mentah provider -> rasio, skor, valuasi.

Menghasilkan satu dict `analysis` yang dipakai baik untuk baris screener maupun
halaman detail saham.
"""
from __future__ import annotations

from typing import Any

from app.analysis import banking, ratios, score, valuation


def analyze(emiten: dict[str, Any], raw: dict[str, Any]) -> dict[str, Any]:
    """`emiten` = {code,name,sector,is_bank}; `raw` = {quote,financials,price_history}."""
    is_bank = emiten["is_bank"]
    quote = raw.get("quote") or {}
    fin = raw.get("financials") or {}
    quarterly = fin.get("quarterly") or []
    annual = fin.get("annual") or []
    price_history = raw.get("price_history") or []

    headline = ratios.headline_ratios(quarterly, annual)
    per_period = ratios.per_period_ratios(quarterly)
    rev_growth = ratios.yoy_growth(quarterly, "total_revenue")
    earn_growth = ratios.yoy_growth(quarterly, "net_income")
    dupont = ratios.dupont(headline)

    bank_m = None
    if is_bank:
        bank_m = banking.bank_metrics(quarterly, headline)
        sc = banking.bank_score(headline, bank_m, earn_growth)
    else:
        sc = score.fundamental_score(headline, per_period, rev_growth, earn_growth)
    grade = score.grade(sc)

    val = valuation.value_stock(
        is_bank=is_bank,
        quote=quote,
        headline=headline,
        annual=annual,
        price_history=price_history,
        earnings_growth=earn_growth,
    )

    return {
        "code": emiten["code"],
        "name": emiten["name"],
        "sector": emiten["sector"],
        "is_bank": is_bank,
        "price": quote.get("price"),
        "change_pct": quote.get("change_pct"),
        "score": sc,
        "grade": grade,
        "headline": headline,
        "dupont": dupont,
        "bank_metrics": bank_m,
        "per_period": per_period,
        "revenue_growth": _r(rev_growth),
        "earnings_growth": _r(earn_growth),
        "valuation": val,
    }


def _r(v: float | None) -> float | None:
    return None if v is None else round(v, 2)
