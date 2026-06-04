"""Generate snapshot data statis (JSON) untuk frontend.

Dijalankan oleh GitHub Actions secara terjadwal: menarik data terbaru dari Yahoo,
menganalisa seluruh universe, lalu menulis file JSON ke `frontend/public/data/`.
Frontend (mode statis) membaca file-file ini — tanpa perlu backend yang selalu nyala.

Output:
  frontend/public/data/market/ihsg.json
  frontend/public/data/market/overview.json
  frontend/public/data/screener.json
  frontend/public/data/stocks/<KODE>.json   (detail + price_history)
  frontend/public/data/meta.json            (updated_at)
"""
from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from pathlib import Path

from app.analysis.engine import analyze
from app.api.screener import _to_row
from app.api.stocks import _detail
from app.core.config import IHSG_SYMBOL
from app.core.universe import UNIVERSE
from app.data.refresh import _emiten_dict, _fetch_raw

OUT = Path(__file__).resolve().parents[1] / "frontend" / "public" / "data"


def _write(rel: str, obj) -> None:
    path = OUT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False), encoding="utf-8")


def main() -> None:
    now = datetime.now(timezone.utc).isoformat()
    analyses: list[dict] = []
    failed: list[str] = []

    for em in UNIVERSE:
        try:
            raw = _fetch_raw(em)
            a = analyze(_emiten_dict(em), raw)
            a["price_history"] = raw["price_history"]
            a["_updated_at"] = now
            analyses.append(a)
            detail = {**_detail(a), "price_history": a["price_history"]}
            _write(f"stocks/{em.code}.json", detail)
            print(f"ok  {em.code}")
        except Exception as e:  # noqa: BLE001
            failed.append(em.code)
            print(f"ERR {em.code}: {e}")
        time.sleep(0.4)

    # IHSG
    from app.data.refresh import provider

    try:
        ihsg_hist = provider.get_index_history(IHSG_SYMBOL, period="1y")
    except Exception:  # noqa: BLE001
        ihsg_hist = []
    if ihsg_hist:
        last = ihsg_hist[-1]["close"]
        prev = ihsg_hist[-2]["close"] if len(ihsg_hist) > 1 else last
        change = last - prev
        change_pct = (change / prev * 100) if prev else 0
        _write("market/ihsg.json", {
            "symbol": IHSG_SYMBOL,
            "last": round(last, 2),
            "change": round(change, 2),
            "change_pct": round(change_pct, 2),
            "prev_close": round(prev, 2),
            "history": ihsg_hist,
            "updated_at": now,
        })

    # Screener
    rows = [_to_row(a) for a in analyses]
    rows.sort(key=lambda r: r.get("score") or 0, reverse=True)
    _write("screener.json", {"rows": rows, "count": len(rows), "updated_at": now})

    # Overview
    adv = sum(1 for a in analyses if (a.get("change_pct") or 0) > 0)
    dec = sum(1 for a in analyses if (a.get("change_pct") or 0) < 0)
    scores = [a.get("score") for a in analyses if a.get("score") is not None]
    ihsg_last = round(ihsg_hist[-1]["close"], 2) if ihsg_hist else 0
    ihsg_chg = 0.0
    if len(ihsg_hist) > 1 and ihsg_hist[-2]["close"]:
        ihsg_chg = round((ihsg_hist[-1]["close"] - ihsg_hist[-2]["close"]) / ihsg_hist[-2]["close"] * 100, 2)
    _write("market/overview.json", {
        "ihsg_last": ihsg_last,
        "ihsg_change_pct": ihsg_chg,
        "advancers": adv,
        "decliners": dec,
        "unchanged": len(analyses) - adv - dec,
        "avg_score": round(sum(scores) / len(scores), 1) if scores else 0,
        "total_emiten": len(analyses),
        "updated_at": now,
    })

    _write("meta.json", {"updated_at": now, "ok": len(analyses), "failed": failed})
    print(f"\nDONE: {len(analyses)} ok, {len(failed)} failed -> {OUT}")


if __name__ == "__main__":
    main()
