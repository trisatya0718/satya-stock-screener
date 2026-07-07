#!/usr/bin/env python3
"""Cek sinyal BTC/USDT (mirror logika frontend/lib/crypto.ts) & kirim Telegram.

Dijalankan GitHub Actions tiap ~30 menit. Env yang dibutuhkan (repo Secrets):
  TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
State bias terakhir disimpan di STATE_FILE (di-cache antar run) supaya pesan
hanya terkirim saat sinyal BERUBAH (WAIT->LONG, LONG->WAIT, dst).

Hanya butuh `requests` (pure python, tanpa pandas).
"""
from __future__ import annotations

import json
import os
import sys

import requests

HOSTS = [
    "https://data-api.binance.vision/api/v3",
    "https://api.binance.com/api/v3",
    "https://api1.binance.com/api/v3",
]
UA = {"User-Agent": "Mozilla/5.0 (satya-screener-signal-bot)"}
STATE_FILE = os.environ.get("STATE_FILE", "btc_state.json")
SITE = "https://satya-stock-screener.vercel.app/crypto"


def get(path: str):
    last = None
    for h in HOSTS:
        try:
            r = requests.get(h + path, headers=UA, timeout=15)
            if r.ok:
                return r.json()
            last = Exception(f"HTTP {r.status_code} dari {h}")
        except Exception as e:  # noqa: BLE001
            last = e
    raise last  # type: ignore[misc]


def klines(interval: str, limit: int):
    rows = get(f"/klines?symbol=BTCUSDT&interval={interval}&limit={limit}")
    return [
        {"h": float(r[2]), "l": float(r[3]), "c": float(r[4])}
        for r in rows
    ]


def ema(vals, n):
    out = [None] * len(vals)
    if len(vals) < n:
        return out
    k = 2 / (n + 1)
    prev = sum(vals[:n]) / n
    out[n - 1] = prev
    for i in range(n, len(vals)):
        prev = vals[i] * k + prev * (1 - k)
        out[i] = prev
    return out


def last(arr):
    for v in reversed(arr):
        if v is not None:
            return v
    return None


def rsi_last(closes, n=14):
    if len(closes) < n + 1:
        return 50.0
    gain = loss = 0.0
    for i in range(1, n + 1):
        d = closes[i] - closes[i - 1]
        gain += max(d, 0)
        loss += max(-d, 0)
    ag, al = gain / n, loss / n
    for i in range(n + 1, len(closes)):
        d = closes[i] - closes[i - 1]
        ag = (ag * (n - 1) + max(d, 0)) / n
        al = (al * (n - 1) + max(-d, 0)) / n
    if al == 0:
        return 100.0
    return 100 - 100 / (1 + ag / al)


def atr_last(cs, n=14):
    if len(cs) < n + 1:
        return 0.0
    trs = []
    for i in range(1, len(cs)):
        c, pc = cs[i], cs[i - 1]["c"]
        trs.append(max(c["h"] - c["l"], abs(c["h"] - pc), abs(c["l"] - pc)))
    a = sum(trs[:n]) / n
    for t in trs[n:]:
        a = (a * (n - 1) + t) / n
    return a


def macd_hist(closes):
    e12, e26 = ema(closes, 12), ema(closes, 26)
    line = [a - b for a, b in zip(e12, e26) if a is not None and b is not None]
    sig = ema(line, 9)
    if not line or sig[-1] is None:
        return 0.0
    return line[-1] - sig[-1]


def swing_levels(cs, atr, k=5):
    price = cs[-1]["c"]
    highs, lows = [], []
    for i in range(k, len(cs) - k):
        win = cs[i - k : i + k + 1]
        if cs[i]["h"] == max(w["h"] for w in win):
            highs.append(cs[i]["h"])
        if cs[i]["l"] == min(w["l"] for w in win):
            lows.append(cs[i]["l"])

    def cluster(levels):
        out, grp = [], []
        for v in sorted(levels):
            if not grp or v - grp[-1] < 0.5 * atr:
                grp.append(v)
            else:
                out.append(sum(grp) / len(grp))
                grp = [v]
        if grp:
            out.append(sum(grp) / len(grp))
        return out

    allv = cluster(highs + lows)
    sup = sorted([v for v in allv if v < price], reverse=True)[:3]
    res = sorted([v for v in allv if v > price])[:3]
    return sup, res


def analyze(cs, htf):
    closes = [c["c"] for c in cs]
    price = closes[-1]
    e50, e200 = last(ema(closes, 50)), last(ema(closes, 200))
    r = rsi_last(closes)
    a = atr_last(cs)
    hist = macd_hist(closes)
    sup, res = swing_levels(cs, a or price * 0.005)

    htf_up = None
    if htf and len(htf) >= 60:
        hc = [c["c"] for c in htf]
        h50 = last(ema(hc, 50))
        if h50 is not None:
            htf_up = hc[-1] > h50

    score = 0
    if e50:
        score += 1 if price > e50 else -1
    if e50 and e200:
        score += 1 if e50 > e200 else -1
    score += 1 if hist > 0 else -1
    if r >= 55:
        score += 1
    elif r <= 45:
        score -= 1
    if htf_up is not None:
        score += 1 if htf_up else -1

    bias = "WAIT"
    if score >= 3 and r < 78:
        bias = "LONG"
    elif score <= -3 and r > 22:
        bias = "SHORT"

    entry = stop = tp1 = tp2 = None
    if bias != "WAIT" and a > 0:
        entry = price
        risk = 1.5 * a
        if bias == "LONG":
            stop = entry - risk
            snap = [x for x in res if entry + 0.8 * risk < x < entry + 2 * risk]
            tp1 = snap[0] if snap else entry + 1.5 * risk
            tp2 = entry + 2.5 * risk
        else:
            stop = entry + risk
            snap = [x for x in sup if entry - 2 * risk < x < entry - 0.8 * risk]
            tp1 = snap[0] if snap else entry - 1.5 * risk
            tp2 = entry - 2.5 * risk

    return {"bias": bias, "score": score, "price": price, "rsi": r,
            "entry": entry, "stop": stop, "tp1": tp1, "tp2": tp2}


def send_telegram(token, chat, text):
    r = requests.post(
        f"https://api.telegram.org/bot{token}/sendMessage",
        json={"chat_id": chat, "text": text, "parse_mode": "HTML",
              "disable_web_page_preview": True},
        timeout=15,
    )
    r.raise_for_status()


def fmt(v):
    return f"${v:,.0f}"


def main():
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    chat = os.environ.get("TELEGRAM_CHAT_ID")
    if not token or not chat:
        print("Secrets TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID belum di-set — lewati.")
        return

    try:
        a = analyze(klines("1h", 400), klines("4h", 250))
    except Exception as e:  # noqa: BLE001
        # Jangan gagalkan job terjadwal (menghindari spam email) — cukup log.
        print(f"GAGAL ambil data harga: {e}")
        return

    prev = "WAIT"
    if os.path.exists(STATE_FILE):
        try:
            prev = json.load(open(STATE_FILE)).get("bias", "WAIT")
        except Exception:  # noqa: BLE001
            pass

    print(f"bias={a['bias']} (sebelumnya {prev}) skor={a['score']:+d} "
          f"harga={a['price']:.0f} RSI={a['rsi']:.0f}")

    if a["bias"] != prev:
        if a["bias"] != "WAIT":
            arah = "🟢 LONG" if a["bias"] == "LONG" else "🔴 SHORT"
            text = (
                f"{arah} <b>BTC/USDT</b> (1h)\n"
                f"Harga {fmt(a['price'])} · skor {a['score']:+d} · RSI {a['rsi']:.0f}\n\n"
                f"Entry: <b>{fmt(a['entry'])}</b>\n"
                f"Stop Loss: <b>{fmt(a['stop'])}</b>\n"
                f"TP1: <b>{fmt(a['tp1'])}</b> · TP2: <b>{fmt(a['tp2'])}</b>\n\n"
                f"Sinyal teknikal otomatis — bukan rekomendasi. Selalu pakai stop loss.\n{SITE}"
            )
        else:
            text = f"⚪ Sinyal {prev} BTC/USDT berakhir → WAIT (confluence melemah).\n{SITE}"
        send_telegram(token, chat, text)
        print("Notifikasi Telegram terkirim.")
    else:
        print("Tidak ada perubahan sinyal — tidak kirim.")

    json.dump({"bias": a["bias"]}, open(STATE_FILE, "w"))


if __name__ == "__main__":
    main()
