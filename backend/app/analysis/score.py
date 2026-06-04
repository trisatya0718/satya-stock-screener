"""Fundamental score untuk emiten non-bank + util grade & tren."""
from __future__ import annotations

from typing import Any


def _band(v: float | None, *, lo: float, hi: float) -> float:
    if v is None:
        return 0.0
    if v <= lo:
        return 0.0
    if v >= hi:
        return 1.0
    return (v - lo) / (hi - lo)


def trend_slope(periods: list[dict[str, Any]], key: str) -> float | None:
    """Slope sederhana (regresi linear) dari sebuah rasio sepanjang periode.

    `periods` terbaru-dulu; dibalik agar urut waktu. Mengembalikan slope per langkah.
    """
    series = [p.get(key) for p in reversed(periods) if p.get(key) is not None]
    n = len(series)
    if n < 3:
        return None
    xs = list(range(n))
    mx = sum(xs) / n
    my = sum(series) / n
    denom = sum((x - mx) ** 2 for x in xs)
    if denom == 0:
        return None
    num = sum((xs[i] - mx) * (series[i] - my) for i in range(n))
    return num / denom


def fundamental_score(
    headline: dict[str, Any],
    per_period: list[dict[str, Any]],
    revenue_growth: float | None,
    earnings_growth: float | None,
) -> float:
    """Skor 0–100 untuk non-bank.

    Komponen: profitabilitas (35), pertumbuhan (25), tren margin (20),
    kualitas/leverage (10), konsistensi (10).
    """
    roe = headline.get("roe")
    npm = headline.get("npm")
    roa = headline.get("roa")
    em = headline.get("em")

    # Profitabilitas (35): ROE (20) + NPM (8) + ROA (7)
    s_prof = _band(roe, lo=0, hi=20) * 20 + _band(npm, lo=0, hi=20) * 8 + _band(roa, lo=0, hi=12) * 7

    # Pertumbuhan (25): revenue YoY (10) + earnings YoY (15)
    s_growth = _band(revenue_growth, lo=0, hi=20) * 10 + _band(earnings_growth, lo=0, hi=25) * 15

    # Tren margin (20): slope OPM & NPM membaik
    opm_slope = trend_slope(per_period, "opm")
    npm_slope = trend_slope(per_period, "npm")
    s_trend = _band(opm_slope, lo=0, hi=2) * 10 + _band(npm_slope, lo=0, hi=2) * 10

    # Kualitas/leverage (10): EM tidak berlebihan (penalti EM tinggi)
    if em is None:
        s_quality = 5.0
    elif em <= 2:
        s_quality = 10.0
    elif em >= 4:
        s_quality = 2.0
    else:
        s_quality = 10.0 - (em - 2) * 4  # 2->10, 4->2

    # Konsistensi (10): tidak ada rugi di periode tersedia
    losses = sum(1 for p in per_period if (p.get("net_income") or 0) < 0)
    s_consistency = 10.0 if losses == 0 else max(0.0, 10.0 - losses * 3)

    total = s_prof + s_growth + s_trend + s_quality + s_consistency
    return round(min(100.0, total), 1)


def grade(score: float) -> str:
    if score >= 80:
        return "A"
    if score >= 65:
        return "B"
    if score >= 50:
        return "C"
    if score >= 35:
        return "D"
    return "E"
