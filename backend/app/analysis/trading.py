"""Sinyal swing-trade (1–3 hari) dari OHLCV harian.

Indikator objektif & transparan: tren (MA20/MA50), breakout 20-hari, lonjakan
volume, RSI, dan ATR untuk menentukan Entry / Stop Loss / Take Profit dengan
risk:reward tetap (2:1). BUKAN jaminan profit — lihat disclaimer di UI.

Catatan jujur: berbasis data HARIAN (bukan intraday), jadi horizon realistis
beberapa hari. Tidak memakai data berita (sumber gratis andal tak tersedia).
"""
from __future__ import annotations

from typing import Any

import pandas as pd

RR = 2.0           # risk : reward 1 : 2
ATR_MULT = 1.5     # jarak stop = 1.5 × ATR
MIN_BARS = 60


def _rsi(close: pd.Series, n: int = 14) -> pd.Series:
    d = close.diff()
    up = d.clip(lower=0).rolling(n).mean()
    dn = (-d.clip(upper=0)).rolling(n).mean()
    rs = up / dn.replace(0, pd.NA)
    return 100 - 100 / (1 + rs)


def _atr(df: pd.DataFrame, n: int = 14) -> pd.Series:
    h, l, c = df["high"], df["low"], df["close"]
    pc = c.shift(1)
    tr = pd.concat([(h - l), (h - pc).abs(), (l - pc).abs()], axis=1).max(axis=1)
    return tr.rolling(n).mean()


def compute_signal(hist: list[dict[str, Any]]) -> dict[str, Any] | None:
    """Kembalikan setup long valid atau None bila tak memenuhi syarat."""
    if not hist or len(hist) < MIN_BARS:
        return None
    df = pd.DataFrame(hist)
    for col in ("open", "high", "low", "close", "volume"):
        if col not in df:
            return None
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df = df.dropna(subset=["close", "high", "low"])
    if len(df) < MIN_BARS:
        return None

    close = df["close"]
    vol = df["volume"].fillna(0)
    sma20 = close.rolling(20).mean()
    sma50 = close.rolling(50).mean()
    rsi = _rsi(close)
    atr = _atr(df)
    vol20 = vol.rolling(20).mean()
    high20_prev = df["high"].rolling(20).max().shift(1)

    price = float(close.iloc[-1])
    a = float(atr.iloc[-1]) if pd.notna(atr.iloc[-1]) else 0.0
    s20 = float(sma20.iloc[-1]) if pd.notna(sma20.iloc[-1]) else 0.0
    s50 = float(sma50.iloc[-1]) if pd.notna(sma50.iloc[-1]) else 0.0
    r = float(rsi.iloc[-1]) if pd.notna(rsi.iloc[-1]) else 50.0
    v_avg = float(vol20.iloc[-1]) if pd.notna(vol20.iloc[-1]) else 0.0
    vr = (float(vol.iloc[-1]) / v_avg) if v_avg > 0 else 0.0
    h20 = float(high20_prev.iloc[-1]) if pd.notna(high20_prev.iloc[-1]) else 0.0

    # Fokus saham yang TREN-nya masih naik (di atas MA50) dan tidak jatuh jauh dari
    # MA20 — ini saham relatif kuat, justru yang layak di-long saat pasar lemah.
    # Buang yang jelas downtrend (harga < MA50) atau RSI ekstrem.
    if a <= 0 or s50 <= 0 or price < s50 or price < 0.95 * s20:
        return None
    if r > 85 or r < 40 or vr < 0.8:
        return None

    signals: list[str] = []
    score = 0
    if price > s20 > s50:
        signals.append("Uptrend kuat (harga > MA20 > MA50)"); score += 25
    else:
        signals.append("Uptrend menengah (harga > MA50)"); score += 15
    if h20 and price >= h20:
        signals.append("Breakout tertinggi 20-hari"); score += 20
    if vr >= 1.5:
        signals.append(f"Volume lonjak {vr:.1f}×"); score += 20
    elif vr >= 1.2:
        signals.append(f"Volume naik {vr:.1f}×"); score += 10
    if 50 <= r <= 70:
        signals.append(f"RSI sehat ({r:.0f})"); score += 15
    elif 45 <= r < 50:
        signals.append(f"RSI pullback ({r:.0f})"); score += 12
    elif 70 < r <= 82:
        signals.append(f"RSI kuat ({r:.0f})"); score += 6
    if 0.95 * s20 <= price <= 1.03 * s20:
        signals.append("Dekat support MA20 (dip-buy)"); score += 10

    entry = round(price, 2)
    stop = round(entry - ATR_MULT * a, 2)
    risk = entry - stop
    if risk <= 0:
        return None
    tp = round(entry + RR * risk, 2)

    return {
        "setup_score": min(100, score),
        "entry": entry,
        "stop_loss": stop,
        "take_profit": tp,
        "rr": RR,
        "risk_pct": round(risk / entry * 100, 2),
        "reward_pct": round((tp - entry) / entry * 100, 2),
        "rsi": round(r, 1),
        "atr": round(a, 2),
        "volume_ratio": round(vr, 2),
        "avg_value": round(price * v_avg),  # proxy likuiditas (Rp/hari)
        "signals": signals,
    }


def scan(emiten_histories: list[dict[str, Any]], top: int = 10) -> list[dict[str, Any]]:
    """`emiten_histories` = [{code,name,sector,price,change_pct,price_history}].

    Kembalikan ≤ top setup terbaik (skor tertinggi), hanya yang cukup likuid.
    """
    picks: list[dict[str, Any]] = []
    for e in emiten_histories:
        sig = compute_signal(e.get("price_history") or [])
        if not sig:
            continue
        # likuiditas minimal ~Rp300 juta/hari agar bisa keluar-masuk
        if sig["avg_value"] < 300_000_000:
            continue
        picks.append({
            "code": e["code"],
            "name": e.get("name"),
            "sector": e.get("sector"),
            "price": e.get("price"),
            "change_pct": e.get("change_pct"),
            **sig,
        })
    picks.sort(key=lambda p: (p["setup_score"], p["avg_value"]), reverse=True)
    return picks[:top]
