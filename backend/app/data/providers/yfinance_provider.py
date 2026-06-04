"""Provider berbasis yfinance (Yahoo Finance) untuk harga, IHSG, dan laporan keuangan.

Yahoo agresif rate-limit, jadi kita pakai session curl_cffi (impersonate browser)
dan retry/backoff. Hasilnya dinormalisasi ke struktur dict sederhana.
"""
from __future__ import annotations

import time
from typing import Any

import pandas as pd
import yfinance as yf
from curl_cffi import requests as creq

# Session di-share antar pemanggilan agar cookie/crumb Yahoo tetap valid.
_session = creq.Session(impersonate="chrome")

# Pemetaan label baris yfinance -> key ternormalisasi kita.
_INCOME_MAP = {
    "Total Revenue": "total_revenue",
    "Cost Of Revenue": "cost_of_revenue",
    "Gross Profit": "gross_profit",
    "Operating Income": "operating_income",
    "Pretax Income": "pretax_income",
    "Net Income": "net_income",
    "Interest Income": "interest_income",
    "Net Interest Income": "net_interest_income",
    "Interest Expense": "interest_expense",
}
_BALANCE_MAP = {
    "Total Assets": "total_assets",
    "Total Equity Gross Minority Interest": "total_equity",
    "Stockholders Equity": "stockholders_equity",
    "Total Debt": "total_debt",
}


def _retry(fn, *, tries: int = 3, base_delay: float = 1.5):
    last = None
    for i in range(tries):
        try:
            return fn()
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(base_delay * (i + 1))
    raise last  # type: ignore[misc]


def _ticker(code: str) -> yf.Ticker:
    return yf.Ticker(f"{code}.JK", session=_session)


def _period_label(ts: pd.Timestamp, *, quarterly: bool) -> str:
    if quarterly:
        q = (ts.month - 1) // 3 + 1
        return f"{ts.year}-Q{q}"
    return str(ts.year)


def _safe(df: pd.DataFrame | None, label: str, col) -> float | None:
    if df is None or df.empty or label not in df.index or col not in df.columns:
        return None
    val = df.loc[label, col]
    try:
        f = float(val)
    except (TypeError, ValueError):
        return None
    return None if pd.isna(f) else f


def _extract(income: pd.DataFrame, balance: pd.DataFrame, *, quarterly: bool) -> list[dict[str, Any]]:
    """Gabungkan income + balance per periode jadi list record terurut (terbaru dulu)."""
    cols = list(income.columns) if income is not None and not income.empty else []
    # gabung kolom balance yang mungkin tidak identik
    if balance is not None and not balance.empty:
        for c in balance.columns:
            if c not in cols:
                cols.append(c)
    cols = sorted(cols, reverse=True)

    records: list[dict[str, Any]] = []
    for col in cols:
        rec: dict[str, Any] = {"period": _period_label(col, quarterly=quarterly),
                               "period_end": str(col.date())}
        for label, key in _INCOME_MAP.items():
            rec[key] = _safe(income, label, col)
        for label, key in _BALANCE_MAP.items():
            rec[key] = _safe(balance, label, col)
        # buang record yang benar-benar kosong
        if any(v is not None for k, v in rec.items() if k not in ("period", "period_end")):
            records.append(rec)
    return records


class YFinanceProvider:
    def get_index_history(self, symbol: str, period: str = "1y") -> list[dict[str, Any]]:
        def _do():
            return yf.Ticker(symbol, session=_session).history(period=period, interval="1d")
        hist = _retry(_do)
        return _history_to_points(hist)

    def get_price_history(self, code: str, period: str = "3y") -> list[dict[str, Any]]:
        def _do():
            return _ticker(code).history(period=period, interval="1d")
        hist = _retry(_do)
        return _history_to_points(hist)

    def get_quote(self, code: str) -> dict[str, Any]:
        t = _ticker(code)
        info = _retry(lambda: t.info) or {}
        price = info.get("currentPrice") or info.get("regularMarketPrice")
        prev = info.get("previousClose") or info.get("regularMarketPreviousClose")
        change = (price - prev) if (price is not None and prev is not None) else None
        change_pct = (change / prev * 100) if (change is not None and prev) else None
        return {
            "price": _num(price),
            "prev_close": _num(prev),
            "change": _num(change),
            "change_pct": _num(change_pct),
            "shares": _num(info.get("sharesOutstanding")),
            "per": _num(info.get("trailingPE")),
            "pbv": _num(info.get("priceToBook")),
            "eps_ttm": _num(info.get("trailingEps")),
            "book_value": _num(info.get("bookValue")),
            "payout_ratio": _num(info.get("payoutRatio")),
            "dividend_yield": _num(info.get("dividendYield")),
            "beta": _num(info.get("beta")),
            "market_cap": _num(info.get("marketCap")),
            "yahoo_sector": info.get("sector"),
        }

    def get_financials(self, code: str) -> dict[str, Any]:
        t = _ticker(code)
        q_inc = _retry(lambda: t.quarterly_income_stmt)
        q_bal = _retry(lambda: t.quarterly_balance_sheet)
        a_inc = _retry(lambda: t.income_stmt)
        a_bal = _retry(lambda: t.balance_sheet)
        return {
            "quarterly": _extract(q_inc, q_bal, quarterly=True),
            "annual": _extract(a_inc, a_bal, quarterly=False),
        }


def _num(v) -> float | None:
    if v is None:
        return None
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return None if pd.isna(f) else f


def _history_to_points(hist: pd.DataFrame) -> list[dict[str, Any]]:
    if hist is None or hist.empty:
        return []
    points: list[dict[str, Any]] = []
    for idx, row in hist.iterrows():
        points.append({
            "date": str(pd.Timestamp(idx).date()),
            "open": _num(row.get("Open")),
            "high": _num(row.get("High")),
            "low": _num(row.get("Low")),
            "close": _num(row.get("Close")),
            "volume": _num(row.get("Volume")),
        })
    return points
