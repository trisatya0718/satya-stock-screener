"""Skema respons API (Pydantic)."""
from __future__ import annotations

from pydantic import BaseModel


class PricePoint(BaseModel):
    date: str
    open: float | None = None
    high: float | None = None
    low: float | None = None
    close: float
    volume: float | None = None


class IhsgResponse(BaseModel):
    symbol: str
    last: float
    change: float
    change_pct: float
    prev_close: float
    history: list[PricePoint]
    updated_at: str


class MarketOverview(BaseModel):
    ihsg_last: float
    ihsg_change_pct: float
    advancers: int
    decliners: int
    unchanged: int
    avg_score: float
    total_emiten: int
    updated_at: str | None = None


class RatioPeriod(BaseModel):
    period: str           # mis. "2024-Q1" atau "2024"
    gpm: float | None = None
    opm: float | None = None
    npm: float | None = None
    tato: float | None = None
    roa: float | None = None
    em: float | None = None
    roe: float | None = None
    revenue: float | None = None
    net_income: float | None = None


class ScreenerRow(BaseModel):
    code: str
    name: str
    sector: str
    is_bank: bool
    price: float | None = None
    change_pct: float | None = None
    score: float
    grade: str
    roe: float | None = None
    roa: float | None = None
    npm: float | None = None
    revenue_growth: float | None = None
    earnings_growth: float | None = None
    per: float | None = None
    pbv: float | None = None
    upside_pct: float | None = None


class ScreenerResponse(BaseModel):
    rows: list[ScreenerRow]
    updated_at: str | None = None
    count: int


class DupontBreakdown(BaseModel):
    npm: float | None = None
    tato: float | None = None
    em: float | None = None
    roe: float | None = None
    # narasi singkat soal apa yang mendorong ROE
    driver: str | None = None


class BankMetrics(BaseModel):
    nim: float | None = None
    npl: float | None = None
    casa: float | None = None
    car: float | None = None
    bopo: float | None = None
    ldr: float | None = None
    roe: float | None = None
    roa: float | None = None


class Valuation(BaseModel):
    method: str                       # "pe_pb_band" | "bank_justified_pbv"
    price: float | None = None
    fair_value: float | None = None
    buy_price: float | None = None
    upside_pct: float | None = None
    per: float | None = None
    pbv: float | None = None
    per_mean: float | None = None
    pbv_mean: float | None = None
    justified_per: float | None = None
    justified_pbv: float | None = None
    hold_years: float | None = None
    verdict: str                      # "BUY" | "WAIT" | "AVOID"
    notes: list[str] = []


class StockDetail(BaseModel):
    code: str
    name: str
    sector: str
    is_bank: bool
    price: float | None = None
    change_pct: float | None = None
    score: float
    grade: str
    dupont: DupontBreakdown
    bank_metrics: BankMetrics | None = None
    ratios: list[RatioPeriod]
    valuation: Valuation
    updated_at: str | None = None


class RefreshStatus(BaseModel):
    status: str
    refreshed: int
    failed: list[str] = []
    updated_at: str | None = None
