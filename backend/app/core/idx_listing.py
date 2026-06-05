"""Ambil daftar emiten dari endpoint resmi IDX (GetSecuritiesStock).

Hanya emiten likuid: papan **Main** + **Development**. Dibuang: **Watchlist**
(papan pemantauan khusus/bermasalah), **Acceleration** (micro), "Ekonomi Baru".

Hasil di-cache ke `backend/data/idx_codes.json` sebagai fallback bila IDX tak bisa
diakses (mis. di runner yang IP-nya diblok Cloudflare).
"""
from __future__ import annotations

import json
from typing import Any

from curl_cffi import requests as creq

from app.core.config import DATA_DIR

_URL = "https://www.idx.co.id/primary/StockData/GetSecuritiesStock"
_CACHE = DATA_DIR / "idx_codes.json"
LIQUID_BOARDS = {"Main", "Development"}

_session = creq.Session(impersonate="chrome")


def _fetch_from_idx() -> list[dict[str, Any]]:
    r = _session.get(
        _URL,
        params={"start": 0, "length": 9999, "code": "", "sector": "",
                "board": "", "language": "en-us"},
        timeout=30,
    )
    r.raise_for_status()
    recs = r.json().get("data", []) or []
    out = [
        {
            "code": str(x.get("Code", "")).strip().upper(),
            "name": str(x.get("Name", "")).strip(),
            "board": x.get("ListingBoard"),
            "shares": x.get("Shares"),
        }
        for x in recs
        if x.get("Code")
    ]
    return out


def refresh_listing_cache() -> list[dict[str, Any]]:
    """Ambil dari IDX & tulis cache. Lempar exception bila gagal."""
    data = _fetch_from_idx()
    _CACHE.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    return data


def _all_listings() -> list[dict[str, Any]]:
    """Coba IDX dulu; bila gagal pakai cache; bila keduanya kosong -> []."""
    try:
        return refresh_listing_cache()
    except Exception:  # noqa: BLE001
        if _CACHE.exists():
            return json.loads(_CACHE.read_text(encoding="utf-8"))
        return []


def get_liquid_codes(limit: int | None = None) -> list[dict[str, Any]]:
    """Daftar emiten likuid (Main+Development). `limit` untuk uji subset."""
    rows = [r for r in _all_listings() if r.get("board") in LIQUID_BOARDS]
    rows.sort(key=lambda r: r["code"])
    return rows[:limit] if limit else rows
