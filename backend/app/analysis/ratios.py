"""Perhitungan rasio fundamental (DuPont) dari laporan keuangan ternormalisasi.

Konvensi:
- `records` = list dict per periode (terbaru dulu) dari provider.
- Margin (GPM/OPM/NPM) dihitung per periode untuk analisa tren.
- ROE/ROA/TATO/EM headline dihitung berbasis TTM (jumlah 4 kuartal terakhir untuk
  besaran flow, dibagi nilai stock periode terbaru) supaya lebih stabil.
"""
from __future__ import annotations

from typing import Any


def _div(a: float | None, b: float | None) -> float | None:
    if a is None or b is None or b == 0:
        return None
    return a / b


def per_period_ratios(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Rasio per periode untuk grafik tren (margin + ROA/ROE/TATO/EM tahunan-setara)."""
    out: list[dict[str, Any]] = []
    for r in records:
        rev = r.get("total_revenue")
        ni = r.get("net_income")
        assets = r.get("total_assets")
        equity = r.get("total_equity") or r.get("stockholders_equity")
        # kuartalan: setahunkan flow (×4) agar level ROA/ROE sebanding antarperiode
        annualize = 4 if r.get("period", "").find("Q") != -1 else 1
        rev_a = rev * annualize if rev is not None else None
        ni_a = ni * annualize if ni is not None else None
        npm = _div(ni, rev)
        tato = _div(rev_a, assets)
        roa = _div(ni_a, assets)
        em = _div(assets, equity)
        roe = _div(ni_a, equity)
        out.append({
            "period": r.get("period"),
            "gpm": _pct(_div(r.get("gross_profit"), rev)),
            "opm": _pct(_div(r.get("operating_income"), rev)),
            "npm": _pct(npm),
            "tato": _round(tato),
            "roa": _pct(roa),
            "em": _round(em),
            "roe": _pct(roe),
            "revenue": rev,
            "net_income": ni,
        })
    return out


def _ttm(records: list[dict[str, Any]], key: str) -> float | None:
    """Jumlah 4 kuartal terakhir untuk besaran flow; None jika data kurang."""
    vals = [r.get(key) for r in records[:4] if r.get(key) is not None]
    if len(vals) < 4:
        return None
    return sum(vals)


def headline_ratios(quarterly: list[dict[str, Any]], annual: list[dict[str, Any]]) -> dict[str, Any]:
    """ROE/ROA/NPM/TATO/EM berbasis TTM; fallback ke tahunan terakhir bila perlu."""
    latest = quarterly[0] if quarterly else (annual[0] if annual else {})
    assets = latest.get("total_assets")
    equity = latest.get("total_equity") or latest.get("stockholders_equity")

    rev = _ttm(quarterly, "total_revenue")
    ni = _ttm(quarterly, "net_income")
    gp = _ttm(quarterly, "gross_profit")
    op = _ttm(quarterly, "operating_income")
    if rev is None and annual:  # fallback tahunan
        a = annual[0]
        rev, ni, gp, op = a.get("total_revenue"), a.get("net_income"), a.get("gross_profit"), a.get("operating_income")
        assets = assets or a.get("total_assets")
        equity = equity or a.get("total_equity") or a.get("stockholders_equity")

    npm = _div(ni, rev)
    tato = _div(rev, assets)
    roa = _div(ni, assets)
    em = _div(assets, equity)
    roe = _div(ni, equity)
    return {
        "gpm": _pct(_div(gp, rev)),
        "opm": _pct(_div(op, rev)),
        "npm": _pct(npm),
        "tato": _round(tato),
        "roa": _pct(roa),
        "em": _round(em),
        "roe": _pct(roe),
        "ni_ttm": ni,
        "revenue_ttm": rev,
        "equity": equity,
        "assets": assets,
    }


def yoy_growth(quarterly: list[dict[str, Any]], key: str) -> float | None:
    """Pertumbuhan YoY: kuartal terbaru vs kuartal yang sama tahun lalu."""
    if not quarterly:
        return None
    latest = quarterly[0]
    period = latest.get("period", "")
    if "-Q" not in period:
        return None
    year, q = period.split("-Q")
    prior = f"{int(year) - 1}-Q{q}"
    cur = latest.get(key)
    prev = next((r.get(key) for r in quarterly if r.get("period") == prior), None)
    if cur is None or prev is None or prev == 0:
        return None
    return (cur - prev) / abs(prev) * 100


def dupont(headline: dict[str, Any]) -> dict[str, Any]:
    """Breakdown DuPont + narasi pendorong ROE."""
    npm, tato, em, roe = headline.get("npm"), headline.get("tato"), headline.get("em"), headline.get("roe")
    driver = None
    if None not in (npm, tato, em):
        # tentukan pendorong dominan secara kualitatif
        if em and em > 3:
            driver = "ROE banyak ditopang leverage tinggi (EM besar) — perhatikan risiko utang."
        elif npm and npm > 15:
            driver = "ROE ditopang margin bersih yang tebal (efisiensi laba kuat)."
        elif tato and tato > 1:
            driver = "ROE ditopang perputaran aset yang tinggi (efisiensi aset)."
        else:
            driver = "ROE merupakan kombinasi seimbang margin, perputaran aset, dan leverage."
    return {"npm": npm, "tato": tato, "em": em, "roe": roe, "driver": driver}


def _pct(v: float | None) -> float | None:
    return None if v is None else round(v * 100, 2)


def _round(v: float | None) -> float | None:
    return None if v is None else round(v, 2)
