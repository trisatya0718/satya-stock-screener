"""Konfigurasi aplikasi backend."""
from pathlib import Path

# Direktori data & lokasi SQLite cache
BASE_DIR = Path(__file__).resolve().parents[2]  # .../backend
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)
CACHE_DB = DATA_DIR / "cache.db"

# Ticker indeks IHSG di Yahoo Finance
IHSG_SYMBOL = "^JKSE"

# Berapa lama cache dianggap segar (detik). Default 12 jam.
CACHE_TTL_SECONDS = 12 * 60 * 60

# Asumsi makro untuk valuasi (bisa di-tweak).
RISK_FREE_RATE = 0.065          # ~yield SBN 10y Indonesia
EQUITY_RISK_PREMIUM = 0.075     # premi risiko ekuitas pasar Indonesia
DEFAULT_BETA = 1.0
# Cost of equity (r) = rf + beta * ERP ; dipakai untuk justified PER/PBV.
# Guardrail GGM: COE punya lantai & spread (r-g) minimal supaya multiple tak meledak.
MIN_COST_OF_EQUITY = 0.10       # lantai COE realistis untuk ekuitas Indonesia
MIN_RG_SPREAD = 0.03            # jaga (r - g) >= 3% agar Gordon Growth stabil
MAX_GROWTH = 0.12               # batas atas growth berkelanjutan

# CORS origin frontend
FRONTEND_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
