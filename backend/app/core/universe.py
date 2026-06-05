"""Universe emiten untuk MVP: konstituen LQ45 (campuran bank & non-bank).

Setiap emiten punya kode (tanpa sufiks .JK), nama, sektor, dan flag `is_bank`
yang menentukan jalur analisa (bank pakai modul khusus).
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Emiten:
    code: str
    name: str
    sector: str
    is_bank: bool = False

    @property
    def yahoo_symbol(self) -> str:
        return f"{self.code}.JK"


# Daftar konstituen LQ45 (representatif). Bank ditandai is_bank=True.
UNIVERSE: list[Emiten] = [
    Emiten("BBCA", "Bank Central Asia", "Perbankan", True),
    Emiten("BBRI", "Bank Rakyat Indonesia", "Perbankan", True),
    Emiten("BMRI", "Bank Mandiri", "Perbankan", True),
    Emiten("BBNI", "Bank Negara Indonesia", "Perbankan", True),
    Emiten("BRIS", "Bank Syariah Indonesia", "Perbankan", True),
    Emiten("ARTO", "Bank Jago", "Perbankan", True),
    Emiten("BBTN", "Bank Tabungan Negara", "Perbankan", True),
    Emiten("TLKM", "Telkom Indonesia", "Telekomunikasi"),
    Emiten("ISAT", "Indosat Ooredoo Hutchison", "Telekomunikasi"),
    Emiten("EXCL", "XL Axiata", "Telekomunikasi"),
    Emiten("ASII", "Astra International", "Aneka Industri"),
    Emiten("UNTR", "United Tractors", "Perdagangan & Jasa"),
    Emiten("TPIA", "Chandra Asri Pacific", "Industri Dasar"),
    Emiten("BRPT", "Barito Pacific", "Industri Dasar"),
    Emiten("INKP", "Indah Kiat Pulp & Paper", "Industri Dasar"),
    Emiten("INCO", "Vale Indonesia", "Pertambangan"),
    Emiten("ANTM", "Aneka Tambang", "Pertambangan"),
    Emiten("MDKA", "Merdeka Copper Gold", "Pertambangan"),
    Emiten("ADRO", "Alamtri Resources", "Energi"),
    Emiten("PTBA", "Bukit Asam", "Energi"),
    Emiten("ITMG", "Indo Tambangraya Megah", "Energi"),
    Emiten("PGAS", "Perusahaan Gas Negara", "Energi"),
    Emiten("MEDC", "Medco Energi", "Energi"),
    Emiten("AKRA", "AKR Corporindo", "Energi"),
    Emiten("ICBP", "Indofood CBP", "Konsumer"),
    Emiten("INDF", "Indofood Sukses Makmur", "Konsumer"),
    Emiten("UNVR", "Unilever Indonesia", "Konsumer"),
    Emiten("MYOR", "Mayora Indah", "Konsumer"),
    Emiten("GGRM", "Gudang Garam", "Konsumer"),
    Emiten("HMSP", "HM Sampoerna", "Konsumer"),
    Emiten("CPIN", "Charoen Pokphand Indonesia", "Konsumer"),
    Emiten("AMRT", "Sumber Alfaria Trijaya", "Konsumer"),
    Emiten("KLBF", "Kalbe Farma", "Kesehatan"),
    Emiten("SIDO", "Industri Jamu Sido Muncul", "Kesehatan"),
    Emiten("MIKA", "Mitra Keluarga Karyasehat", "Kesehatan"),
    Emiten("SMGR", "Semen Indonesia", "Industri Dasar"),
    Emiten("INTP", "Indocement Tunggal Prakarsa", "Industri Dasar"),
    Emiten("JPFA", "Japfa Comfeed Indonesia", "Konsumer"),
    Emiten("CTRA", "Ciputra Development", "Properti"),
    Emiten("PWON", "Pakuwon Jati", "Properti"),
    Emiten("BSDE", "Bumi Serpong Damai", "Properti"),
    Emiten("ESSA", "Essa Industries Indonesia", "Energi"),
    Emiten("GOTO", "GoTo Gojek Tokopedia", "Teknologi"),
    Emiten("EMTK", "Elang Mahkota Teknologi", "Teknologi"),
    Emiten("MAPI", "Mitra Adiperkasa", "Perdagangan & Jasa"),
]

BY_CODE: dict[str, Emiten] = {e.code: e for e in UNIVERSE}


def get_emiten(code: str) -> Emiten | None:
    return BY_CODE.get(code.upper())


# Pemetaan sektor Yahoo -> label Indonesia untuk UI.
_SECTOR_MAP = {
    "Financial Services": "Keuangan",
    "Consumer Defensive": "Konsumer",
    "Consumer Cyclical": "Konsumer Siklikal",
    "Basic Materials": "Industri Dasar",
    "Energy": "Energi",
    "Industrials": "Industri",
    "Technology": "Teknologi",
    "Communication Services": "Telekomunikasi",
    "Healthcare": "Kesehatan",
    "Real Estate": "Properti",
    "Utilities": "Utilitas",
}


def classify(industry: str | None, yahoo_sector: str | None) -> tuple[str, bool]:
    """Dari industry/sector Yahoo -> (label sektor Indonesia, is_bank).

    Bank dideteksi dari industry yang mengandung 'bank' (mis. 'Banks—Regional').
    """
    ind = (industry or "").lower()
    is_bank = "bank" in ind
    sector = _SECTOR_MAP.get(yahoo_sector or "", yahoo_sector or "Lainnya")
    return sector, is_bank
