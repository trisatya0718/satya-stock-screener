"""Orkestrasi refresh: ambil data provider untuk seluruh universe, analisa, cache.

Dipanggil oleh endpoint POST /api/refresh (manual) atau scheduler.
"""
from __future__ import annotations

import time
from datetime import datetime, timezone

from app.analysis.engine import analyze
from app.core.config import IHSG_SYMBOL
from app.core.universe import UNIVERSE, Emiten
from app.data import cache
from app.data.providers.yfinance_provider import YFinanceProvider

provider = YFinanceProvider()

# jeda antaremiten agar tidak kena rate-limit Yahoo
_THROTTLE = 0.4


def _fetch_raw(em: Emiten) -> dict:
    return {
        "quote": provider.get_quote(em.code),
        "financials": provider.get_financials(em.code),
        "price_history": provider.get_price_history(em.code, period="3y"),
    }


def _emiten_dict(em: Emiten) -> dict:
    return {"code": em.code, "name": em.name, "sector": em.sector, "is_bank": em.is_bank}


def refresh_one(em: Emiten) -> dict:
    raw = _fetch_raw(em)
    analysis = analyze(_emiten_dict(em), raw)
    # simpan price_history (grafik) + data mentah (quote/financials) agar bisa
    # dianalisa ulang offline tanpa fetch ke Yahoo lagi.
    analysis["price_history"] = raw["price_history"]
    analysis["_raw"] = {"quote": raw["quote"], "financials": raw["financials"]}
    cache.put_emiten(em.code, analysis)
    return analysis


def recompute_all() -> dict:
    """Analisa ulang seluruh emiten dari data mentah di cache (tanpa fetch jaringan)."""
    cache.init_db()
    from app.core.universe import get_emiten

    done = 0
    skipped: list[str] = []
    for cached in cache.get_all_emiten():
        em = get_emiten(cached["code"])
        raw = cached.get("_raw")
        if not em or not raw:
            skipped.append(cached["code"])
            continue
        raw = {**raw, "price_history": cached.get("price_history") or []}
        analysis = analyze(_emiten_dict(em), raw)
        analysis["price_history"] = raw["price_history"]
        analysis["_raw"] = {"quote": raw["quote"], "financials": raw["financials"]}
        cache.put_emiten(em.code, analysis)
        done += 1
    return {"status": "ok", "recomputed": done, "skipped": skipped}


def refresh_ihsg() -> None:
    hist = provider.get_index_history(IHSG_SYMBOL, period="1y")
    cache.set_meta("ihsg_history", _json(hist))


def refresh_all() -> dict:
    cache.init_db()
    failed: list[str] = []
    done = 0
    try:
        refresh_ihsg()
    except Exception:  # noqa: BLE001
        failed.append("IHSG")

    for em in UNIVERSE:
        try:
            refresh_one(em)
            done += 1
        except Exception:  # noqa: BLE001
            failed.append(em.code)
        time.sleep(_THROTTLE)

    ts = datetime.now(timezone.utc).isoformat()
    cache.set_meta("last_refresh", ts)
    return {"status": "ok", "refreshed": done, "failed": failed, "updated_at": ts}


def _json(obj) -> str:
    import json
    return json.dumps(obj)
