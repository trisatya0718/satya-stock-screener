"""Generate snapshot data statis (JSON) untuk frontend — universe luas, 2 fase.

Fase A: analisa SEMUA emiten likuid (Main+Development board) tanpa price history,
        hitung skor. Lalu saring hanya skor > MIN_SCORE.
Fase B: untuk yang lolos, fetch price history 3y + valuasi penuh, tulis detail JSON.

Env:
  LIMIT     : batasi jumlah emiten (uji subset). default semua.
  MIN_SCORE : ambang skor (default 60).

Dijalankan GitHub Actions terjadwal; output ke `frontend/public/data/`.
"""
from __future__ import annotations

import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path

from app.analysis.engine import analyze
from app.api.screener import _to_row
from app.api.stocks import _detail
from app.core.config import IHSG_SYMBOL
from app.core.idx_listing import get_liquid_codes
from app.data.refresh import provider

OUT = Path(os.environ.get("OUT_DIR")) if os.environ.get("OUT_DIR") else \
    Path(__file__).resolve().parents[1] / "frontend" / "public" / "data"
MIN_SCORE = float(os.environ.get("MIN_SCORE", "60"))
LIMIT = int(os.environ["LIMIT"]) if os.environ.get("LIMIT") else None
THROTTLE = float(os.environ.get("THROTTLE", "0.35"))


def _write(rel: str, obj) -> None:
    path = OUT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False), encoding="utf-8")


def _emiten(row: dict) -> dict:
    # sector/is_bank None -> diturunkan dari quote oleh analyze()
    return {"code": row["code"], "name": row.get("name"), "sector": None, "is_bank": None}


def main() -> None:
    now = datetime.now(timezone.utc).isoformat()
    # bersihkan detail lama agar emiten yang kini <60 tak meninggalkan file usang
    stocks_dir = OUT / "stocks"
    if stocks_dir.exists():
        for f in stocks_dir.glob("*.json"):
            f.unlink()
    codes = get_liquid_codes(limit=LIMIT)
    print(f"Universe likuid: {len(codes)} emiten (MIN_SCORE={MIN_SCORE})")

    # ---- Fase A: skor seluruh emiten (tanpa price history) ----
    kept: list[dict] = []          # analisa lengkap (akan diisi price history di fase B)
    raw_by_code: dict[str, dict] = {}
    failed: list[str] = []
    analyzed = 0
    for i, row in enumerate(codes, 1):
        code = row["code"]
        try:
            raw = {
                "quote": provider.get_quote(code),
                "financials": provider.get_financials(code),
                "price_history": [],
            }
            a = analyze(_emiten(row), raw)
            analyzed += 1
            if (a.get("score") or 0) > MIN_SCORE:
                raw_by_code[code] = raw
                kept.append(a)
            if i % 25 == 0:
                print(f"  [A] {i}/{len(codes)} dianalisa={analyzed} lolos={len(kept)} gagal={len(failed)}")
        except Exception as e:  # noqa: BLE001
            failed.append(code)
        time.sleep(THROTTLE)

    print(f"Fase A selesai: {analyzed} dianalisa, {len(kept)} lolos >{MIN_SCORE}, {len(failed)} gagal")

    # ---- Fase B: price history + valuasi untuk yang lolos ----
    final: list[dict] = []
    for j, a in enumerate(kept, 1):
        code = a["code"]
        try:
            hist = provider.get_price_history(code, period="3y")
        except Exception:  # noqa: BLE001
            hist = []
        raw = {**raw_by_code[code], "price_history": hist}
        full = analyze(_emiten({"code": code, "name": a.get("name")}), raw)
        full["price_history"] = hist
        full["_updated_at"] = now
        _write(f"stocks/{code}.json", {**_detail(full), "price_history": hist})
        final.append(full)
        if j % 20 == 0:
            print(f"  [B] {j}/{len(kept)} valuasi selesai")
        time.sleep(THROTTLE)

    # ---- IHSG ----
    try:
        ihsg_hist = provider.get_index_history(IHSG_SYMBOL, period="1y")
    except Exception:  # noqa: BLE001
        ihsg_hist = []
    if ihsg_hist:
        last = ihsg_hist[-1]["close"]
        prev = ihsg_hist[-2]["close"] if len(ihsg_hist) > 1 else last
        chg = last - prev
        _write("market/ihsg.json", {
            "symbol": IHSG_SYMBOL, "last": round(last, 2), "change": round(chg, 2),
            "change_pct": round(chg / prev * 100, 2) if prev else 0,
            "prev_close": round(prev, 2), "history": ihsg_hist, "updated_at": now,
        })

    # ---- Sinyal trading (swing 1-3 hari) atas SELURUH universe likuid ----
    # Batch-download harga (cepat) supaya tak terbatas pada saham skor>60.
    from app.analysis.trading import scan as trading_scan

    name_by = {c["code"]: c.get("name") for c in codes}
    sector_by = {a["code"]: a.get("sector") for a in final}
    prices = provider.download_prices([c["code"] for c in codes], period="1y")
    ems_tr = []
    for code, hist in prices.items():
        if not hist:
            continue
        last = hist[-1]["close"]
        prev = hist[-2]["close"] if len(hist) > 1 else last
        ems_tr.append({
            "code": code, "name": name_by.get(code), "sector": sector_by.get(code),
            "price": last,
            "change_pct": round((last - prev) / prev * 100, 2) if prev else None,
            "price_history": hist,
        })
    picks = trading_scan(ems_tr, top=10)
    print(f"Trading: {len(prices)} harga diunduh, {len(picks)} setup")
    _write("trading.json", {"picks": picks, "count": len(picks), "updated_at": now})

    # ---- Screener + overview + meta ----
    rows = [_to_row(a) for a in final]
    rows.sort(key=lambda r: r.get("score") or 0, reverse=True)
    _write("screener.json", {"rows": rows, "count": len(rows), "updated_at": now})

    adv = sum(1 for a in final if (a.get("change_pct") or 0) > 0)
    dec = sum(1 for a in final if (a.get("change_pct") or 0) < 0)
    scores = [a["score"] for a in final if a.get("score") is not None]
    ihsg_last = round(ihsg_hist[-1]["close"], 2) if ihsg_hist else 0
    ihsg_chg = 0.0
    if len(ihsg_hist) > 1 and ihsg_hist[-2]["close"]:
        ihsg_chg = round((ihsg_hist[-1]["close"] - ihsg_hist[-2]["close"]) / ihsg_hist[-2]["close"] * 100, 2)
    _write("market/overview.json", {
        "ihsg_last": ihsg_last, "ihsg_change_pct": ihsg_chg,
        "advancers": adv, "decliners": dec, "unchanged": len(final) - adv - dec,
        "avg_score": round(sum(scores) / len(scores), 1) if scores else 0,
        "total_emiten": len(final), "total_analyzed": analyzed, "updated_at": now,
    })
    _write("meta.json", {
        "updated_at": now, "passed": len(final), "analyzed": analyzed,
        "universe": len(codes), "failed_count": len(failed),
    })
    print(f"\nDONE: {len(final)} emiten lolos (skor>{MIN_SCORE}) dari {analyzed} dianalisa -> {OUT}")


if __name__ == "__main__":
    main()
