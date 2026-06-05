"""Metrik & valuasi khusus bank.

Dihitung otomatis dari yfinance: NIM (proxy), BOPO/Cost-to-Income, ROE, ROA.
NPL/CAR/CASA/LDR tidak tersedia gratis dari laporan keuangan standar -> diisi dari
input manual `backend/data/bank_manual.csv` (kolom: code,npl,car,casa,ldr).
"""
from __future__ import annotations

import csv
from functools import lru_cache
from typing import Any

from app.analysis.ratios import _div, _pct, _ttm
from app.core.config import DATA_DIR

_MANUAL_CSV = DATA_DIR / "bank_manual.csv"


@lru_cache(maxsize=1)
def _load_manual() -> dict[str, dict[str, float]]:
    """Baca bank_manual.csv -> {CODE: {npl,car,casa,ldr}} (hanya yang terisi)."""
    out: dict[str, dict[str, float]] = {}
    if not _MANUAL_CSV.exists():
        return out
    with _MANUAL_CSV.open(encoding="utf-8") as f:
        for row in csv.DictReader(f):
            code = (row.get("code") or "").strip().upper()
            if not code:
                continue
            vals: dict[str, float] = {}
            for key in ("npl", "car", "casa", "ldr", "bopo"):
                raw = (row.get(key) or "").strip()
                if raw:
                    try:
                        vals[key] = float(raw)
                    except ValueError:
                        pass
            if vals:
                out[code] = vals
    return out


def bank_metrics(quarterly: list[dict[str, Any]], headline: dict[str, Any],
                 code: str = "") -> dict[str, Any]:
    latest = quarterly[0] if quarterly else {}
    assets = headline.get("assets") or latest.get("total_assets")

    # NIM (proxy): Net Interest Income TTM / total aset.
    nii_ttm = _ttm(quarterly, "net_interest_income")
    nim = _div(nii_ttm, assets)

    # CIR / Cost-to-Income (proxy): Beban Operasional / Pendapatan Operasional TTM.
    # Catatan: ini mendekati Cost-to-Income Ratio, BUKAN BOPO format OJK (yang juga
    # memasukkan beban bunga & provisi) — BOPO sebenarnya diisi manual bila perlu.
    opex = _ttm(quarterly, "operating_expense")
    oprev = _ttm(quarterly, "operating_revenue") or _ttm(quarterly, "total_revenue")
    cir = _div(opex, oprev)

    metrics: dict[str, Any] = {
        "nim": _pct(nim),
        "cir": _pct(cir),
        "roe": headline.get("roe"),
        "roa": headline.get("roa"),
        "npl": None,
        "car": None,
        "casa": None,
        "ldr": None,
        "bopo": None,
        "manual_fields": [],  # field yang berasal dari input manual
    }

    # gabungkan input manual (NPL/CAR/CASA/LDR/BOPO)
    manual = _load_manual().get(code.upper(), {})
    for key, val in manual.items():
        metrics[key] = val
        metrics["manual_fields"].append(key)
    return metrics


def bank_score(headline: dict[str, Any], metrics: dict[str, Any],
               earnings_growth: float | None) -> float:
    """Skor bank 0–100: ROE 35, ROA 15, NIM 15, efisiensi CIR 15 (rendah=baik),
    pertumbuhan laba 20. Efisiensi netral bila CIR tak terhitung."""
    roe = headline.get("roe")
    roa = headline.get("roa")
    nim = metrics.get("nim")
    cir = metrics.get("cir")

    s_roe = _band(roe, lo=0, hi=20) * 35
    s_roa = _band(roa, lo=0, hi=3) * 15
    s_nim = _band(nim, lo=0, hi=5) * 15
    # Efisiensi: CIR <=40% -> penuh, >=85% -> 0.
    s_eff = 7.5 if cir is None else _band(85 - cir, lo=0, hi=45) * 15
    s_g = _band(earnings_growth, lo=0, hi=20) * 20

    return round(s_roe + s_roa + s_nim + s_eff + s_g, 1)


def _band(v: float | None, *, lo: float, hi: float) -> float:
    if v is None:
        return 0.0
    if v <= lo:
        return 0.0
    if v >= hi:
        return 1.0
    return (v - lo) / (hi - lo)
