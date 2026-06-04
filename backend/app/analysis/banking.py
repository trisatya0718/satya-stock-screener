"""Metrik & valuasi khusus bank.

Bank tak punya GPM/OPM/TATO seperti perusahaan biasa, jadi dipakai metrik
sendiri. Sebagian metrik (NPL, CAR, CASA, LDR) butuh disclosure bank yang tidak
tersedia dari Yahoo — diisi None untuk MVP dan akan dilengkapi oleh IDX provider.
"""
from __future__ import annotations

from typing import Any

from app.analysis.ratios import _div, _pct, _round, _ttm


def bank_metrics(quarterly: list[dict[str, Any]], headline: dict[str, Any]) -> dict[str, Any]:
    latest = quarterly[0] if quarterly else {}
    assets = headline.get("assets") or latest.get("total_assets")
    nii_ttm = _ttm(quarterly, "net_interest_income")
    # NIM proxy: NII TTM / total aset (proper NIM pakai earning assets — perlu data IDX).
    nim = _div(nii_ttm, assets)
    return {
        "nim": _pct(nim),          # proxy
        "npl": None,               # perlu data IDX (phase 7)
        "casa": None,              # perlu data IDX
        "car": None,               # perlu data IDX
        "bopo": None,              # perlu data IDX
        "ldr": None,               # perlu data IDX
        "roe": headline.get("roe"),
        "roa": headline.get("roa"),
    }


def bank_score(headline: dict[str, Any], metrics: dict[str, Any], earnings_growth: float | None) -> float:
    """Skor bank 0–100 dari metrik yang tersedia (ROE, ROA, NIM proxy, growth)."""
    roe = headline.get("roe")
    roa = headline.get("roa")
    nim = metrics.get("nim")

    # Profitabilitas ROE (bobot 40): 0% -> 0, >=20% -> penuh
    s_roe = _band(roe, lo=0, hi=20) * 40
    # ROA bank biasanya 1–3% (bobot 20)
    s_roa = _band(roa, lo=0, hi=3) * 20
    # NIM proxy (bobot 20): 0 -> 0, >=5% -> penuh
    s_nim = _band(nim, lo=0, hi=5) * 20
    # Pertumbuhan laba (bobot 20): <=0 -> 0, >=20% -> penuh
    s_g = _band(earnings_growth, lo=0, hi=20) * 20

    total = s_roe + s_roa + s_nim + s_g
    return round(total, 1)


def _band(v: float | None, *, lo: float, hi: float) -> float:
    """Normalisasi linear 0..1 dengan clamping. None -> 0."""
    if v is None:
        return 0.0
    if v <= lo:
        return 0.0
    if v >= hi:
        return 1.0
    return (v - lo) / (hi - lo)
