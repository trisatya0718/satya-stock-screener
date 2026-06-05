"""Orkestrasi analisa: data mentah provider -> rasio, skor, valuasi.

Menghasilkan satu dict `analysis` yang dipakai baik untuk baris screener maupun
halaman detail saham.
"""
from __future__ import annotations

from typing import Any

from app.analysis import banking, ratios, score, valuation
from app.core.universe import classify


def analyze(emiten: dict[str, Any], raw: dict[str, Any]) -> dict[str, Any]:
    """`emiten` = {code,name,sector?,is_bank?}; `raw` = {quote,financials,price_history}.

    sector/is_bank boleh None (emiten di luar daftar statis) -> diturunkan dari quote.
    """
    quote = raw.get("quote") or {}
    auto_sector, auto_is_bank = classify(quote.get("industry"), quote.get("yahoo_sector"))
    is_bank = emiten["is_bank"] if emiten.get("is_bank") is not None else auto_is_bank
    sector = emiten.get("sector") or auto_sector
    name = emiten.get("name") or quote.get("long_name") or emiten["code"]
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
        bank_m = banking.bank_metrics(quarterly, headline, code=emiten["code"])
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

    warnings = _warnings(val, earn_growth)

    return {
        "code": emiten["code"],
        "name": name,
        "sector": sector,
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
        "warnings": warnings,
    }


def _warnings(val: dict[str, Any], earn_growth: float | None) -> list[str]:
    """Flag kewaspadaan: valuasi/skor yang perlu diperlakukan hati-hati.

    - upside_ekstrem: |upside| > 150% -> band PE/PB kemungkinan tak andal.
    - histori_tipis : tak ada band historis (per_mean & pbv_mean kosong) -> valuasi
                      hanya bersandar justified, low confidence.
    - laba_lonjakan : laba YoY > 120% -> bisa one-off/siklikal (komoditas, dll).
    """
    w: list[str] = []
    up = val.get("upside_pct")
    if up is not None and abs(up) > 150:
        w.append("upside_ekstrem")
    if val.get("per_mean") is None and val.get("pbv_mean") is None:
        w.append("histori_tipis")
    if earn_growth is not None and earn_growth > 120:
        w.append("laba_lonjakan")
    return w


def _r(v: float | None) -> float | None:
    return None if v is None else round(v, 2)
