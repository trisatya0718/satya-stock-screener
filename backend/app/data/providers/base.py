"""Interface provider data pasar. Memungkinkan sumber lain (IDX) dipasang nanti."""
from __future__ import annotations

from typing import Any, Protocol


class MarketDataProvider(Protocol):
    def get_index_history(self, symbol: str, period: str = "1y") -> list[dict[str, Any]]:
        """Riwayat harga indeks (mis. IHSG ^JKSE)."""
        ...

    def get_quote(self, code: str) -> dict[str, Any]:
        """Snapshot harga & statistik kunci untuk satu emiten (tanpa .JK)."""
        ...

    def get_price_history(self, code: str, period: str = "3y") -> list[dict[str, Any]]:
        ...

    def get_financials(self, code: str) -> dict[str, Any]:
        """Laporan keuangan kuartalan & tahunan ternormalisasi."""
        ...
