"""Valuasi: PE/PB band (non-bank) & justified PBV via Gordon Growth (bank).

Output: fair value, harga beli yang disarankan, upside %, estimasi lama hold,
dan verdict (BUY/WAIT/AVOID).
"""
from __future__ import annotations

import math
from statistics import mean, median, pstdev
from typing import Any

# Batas wajar multiple historis untuk menyaring outlier (tahun laba ~nol, dll).
PER_BOUNDS = (1.0, 60.0)
PBV_BOUNDS = (0.05, 15.0)

from app.core.config import (
    DEFAULT_BETA,
    EQUITY_RISK_PREMIUM,
    MAX_GROWTH,
    MIN_COST_OF_EQUITY,
    MIN_RG_SPREAD,
    RISK_FREE_RATE,
)


def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def _blend(a: float | None, b: float | None) -> float | None:
    """Rata-rata dua estimasi multiple; pakai yang ada bila salah satu None."""
    if a is not None and b is not None:
        return (a + b) / 2
    return a if a is not None else b


def cost_of_equity(beta: float | None) -> float:
    # Beta Yahoo untuk .JK sering tak andal (mis. ~0 untuk bank besar), jadi
    # dibatasi ke rentang wajar dan COE diberi lantai realistis.
    b = _clamp(beta if beta is not None else DEFAULT_BETA, 0.7, 1.6)
    return max(RISK_FREE_RATE + b * EQUITY_RISK_PREMIUM, MIN_COST_OF_EQUITY)


def _yearly_avg_price(price_history: list[dict[str, Any]]) -> dict[int, float]:
    buckets: dict[int, list[float]] = {}
    for p in price_history:
        c = p.get("close")
        if c is None:
            continue
        year = int(p["date"][:4])
        buckets.setdefault(year, []).append(c)
    return {y: mean(v) for y, v in buckets.items() if v}


def _historical_bands(
    annual: list[dict[str, Any]],
    price_history: list[dict[str, Any]],
    shares: float | None,
) -> dict[str, Any]:
    """Bangun seri PER & PBV tahunan dari laba/ekuitas tahunan vs harga rata-rata tahun itu."""
    out: dict[str, Any] = {"per": [], "pbv": []}
    if not shares or shares <= 0:
        return out
    avg_price = _yearly_avg_price(price_history)
    for rec in annual:
        try:
            year = int(rec["period"])
        except (KeyError, ValueError):
            continue
        price = avg_price.get(year)
        if price is None:
            continue
        ni = rec.get("net_income")
        eq = rec.get("total_equity") or rec.get("stockholders_equity")
        if ni and ni > 0:
            per = price / (ni / shares)
            # buang outlier: tahun dengan laba mendekati nol bikin PER meledak ribuan ×
            if PER_BOUNDS[0] <= per <= PER_BOUNDS[1]:
                out["per"].append(per)
        if eq and eq > 0:
            pbv = price / (eq / shares)
            if PBV_BOUNDS[0] <= pbv <= PBV_BOUNDS[1]:
                out["pbv"].append(pbv)
    return out


def _stats(vals: list[float]) -> tuple[float | None, float | None]:
    """Median (robust thd outlier) sebagai pusat band + standar deviasi."""
    vals = [v for v in vals if v is not None and v > 0]
    if not vals:
        return None, None
    m = median(vals)
    s = pstdev(vals) if len(vals) > 1 else 0.0
    return round(m, 2), round(s, 2)


def value_stock(
    *,
    is_bank: bool,
    quote: dict[str, Any],
    headline: dict[str, Any],
    annual: list[dict[str, Any]],
    price_history: list[dict[str, Any]],
    earnings_growth: float | None,
) -> dict[str, Any]:
    price = quote.get("price")
    shares = quote.get("shares")
    roe_pct = headline.get("roe")
    roe = roe_pct / 100 if roe_pct is not None else None
    payout = _clamp(quote.get("payout_ratio") or 0.3, 0.0, 1.0)
    r = cost_of_equity(quote.get("beta"))

    # Sustainable growth g = ROE * retention. Dijaga << r (spread >= MIN_RG_SPREAD)
    # dan dibatasi MAX_GROWTH supaya justified multiple tidak meledak.
    g = None
    if roe is not None:
        g = _clamp(roe * (1 - payout), 0.0, min(MAX_GROWTH, r - MIN_RG_SPREAD))

    # EPS & BVPS terkini
    ni_ttm = headline.get("ni_ttm")
    equity = headline.get("equity")
    eps_ttm = quote.get("eps_ttm")
    if (eps_ttm is None or eps_ttm == 0) and ni_ttm and shares:
        eps_ttm = ni_ttm / shares
    bvps = quote.get("book_value")
    if (bvps is None or bvps == 0) and equity and shares:
        bvps = equity / shares

    bands = _historical_bands(annual, price_history, shares)
    per_mean, per_std = _stats(bands["per"])
    pbv_mean, pbv_std = _stats(bands["pbv"])

    # Multiple terkini dari Yahoo — sanitasi nilai rusak (mis. PBV 22777× karena
    # book value ~nol) agar tidak tampil/menyesatkan.
    cur_per = _sane(quote.get("per"), 0, 300)
    cur_pbv = _sane(quote.get("pbv"), 0, 100)

    justified_per = None
    justified_pbv = None
    if g is not None and r - g > 0:
        justified_per = round(payout * (1 + g) / (r - g), 2)
        if roe is not None:
            justified_pbv = round((roe - g) / (r - g), 2)

    notes: list[str] = []
    fair_value: float | None = None
    buy_price: float | None = None
    method = "bank_justified_pbv" if is_bank else "pe_pb_band"

    if is_bank:
        # Bank: blend justified PBV (Gordon Growth) dengan median PBV historis.
        fair_pbv = _blend(justified_pbv, pbv_mean)
        if fair_pbv and bvps:
            fair_value = fair_pbv * bvps
            notes.append(
                f"Fair value bank dari PBV wajar {round(fair_pbv, 2)}× × BVPS "
                f"(blend justified PBV {justified_pbv}× & median historis {pbv_mean}×)."
            )
        cands = []
        if fair_value:
            cands.append(fair_value * 0.9)
        if pbv_mean is not None and pbv_std is not None and bvps:
            cands.append((pbv_mean - pbv_std) * bvps)
        buy_price = min(cands) if cands else None
        if cur_pbv:
            notes.append(f"PBV saat ini {cur_pbv}× vs PBV wajar di atas.")
    else:
        # Non-bank: blend median PER historis dengan justified PER (GGM) agar tidak
        # terlalu optimis saat pasar de-rating. Fallback ke PB band bila laba labil.
        fair_per = _blend(per_mean, justified_per)
        if fair_per and eps_ttm and eps_ttm > 0:
            fair_value = fair_per * eps_ttm
            notes.append(
                f"Fair value dari PER wajar {round(fair_per, 2)}× × EPS TTM "
                f"(blend median historis {per_mean}× & justified PER {justified_per}×)."
            )
        elif pbv_mean and bvps:
            fair_value = _blend(pbv_mean, justified_pbv) * bvps if _blend(pbv_mean, justified_pbv) else pbv_mean * bvps
            notes.append("Laba tidak stabil — acuan valuasi memakai PB band.")
        cands = []
        if per_mean is not None and per_std is not None and eps_ttm and eps_ttm > 0:
            cands.append((per_mean - per_std) * eps_ttm)
        if fair_value:
            cands.append(fair_value * 0.9)
        buy_price = min(cands) if cands else None
        if cur_per:
            notes.append(f"PER saat ini {cur_per}× (median historis {per_mean}×).")

    upside_pct = None
    if fair_value and price:
        upside_pct = round((fair_value / price - 1) * 100, 1)

    hold_years = _estimate_hold(price, fair_value, g, earnings_growth)

    verdict = _verdict(upside_pct, headline)

    return {
        "method": method,
        "price": _r(price),
        "fair_value": _r(fair_value),
        "buy_price": _r(buy_price),
        "upside_pct": upside_pct,
        "per": cur_per,
        "pbv": cur_pbv,
        "per_mean": per_mean,
        "pbv_mean": pbv_mean,
        "justified_per": justified_per,
        "justified_pbv": justified_pbv,
        "hold_years": hold_years,
        "verdict": verdict,
        "notes": notes,
    }


def _estimate_hold(
    price: float | None,
    fair: float | None,
    g: float | None,
    earnings_growth: float | None,
) -> float | None:
    if not price or not fair or fair <= price:
        return None
    eg = (earnings_growth / 100) if earnings_growth is not None else None
    candidates = [x for x in (g, eg, 0.08) if x is not None and x > 0]
    annual_return = _clamp(max(candidates), 0.05, 0.30)
    years = math.log(fair / price) / math.log(1 + annual_return)
    return round(_clamp(years, 0.5, 5.0), 1)


def _verdict(upside_pct: float | None, headline: dict[str, Any]) -> str:
    score_proxy = headline.get("roe") or 0  # ROE sebagai proxy kualitas cepat
    if upside_pct is None:
        return "N/A"
    if upside_pct < 0 or score_proxy < 5:
        return "AVOID"
    if upside_pct >= 15 and score_proxy >= 10:
        return "BUY"
    return "WAIT"


def _r(v: float | None) -> float | None:
    return None if v is None else round(float(v), 2)


def _sane(v: float | None, lo: float, hi: float) -> float | None:
    """Kembalikan None bila multiple di luar rentang wajar (data Yahoo rusak)."""
    if v is None or v <= lo or v > hi:
        return None
    return v
