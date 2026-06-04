"""Provider IDX (idx.co.id) — daftar laporan keuangan & deteksi laporan baru.

Status: fungsi `get_financial_report_list` & `latest_report_period` memakai
endpoint publik IDX untuk mengetahui *periode laporan terbaru* yang sudah dirilis
emiten. Ini dipakai untuk fitur "auto-refresh saat laporan keuangan baru terbit"
(bandingkan periode terbaru IDX vs yang sudah tersimpan di cache).

TODO (iterasi berikutnya): unduh lampiran XBRL (instance.zip) dari `file_url`,
parse iXBRL untuk menarik pos laporan keuangan lengkap & history >5 tahun guna
memperdalam PE/PB band dan mengisi metrik bank (NPL, CAR, CASA, LDR, BOPO) yang
belum tersedia dari Yahoo. Lihat referensi parser:
  - https://github.com/Rachdyan/idx_financial_report
  - https://github.com/noczero/idx-fundamental-analysis

IDX dilindungi Cloudflare; pakai session curl_cffi (impersonate browser).
"""
from __future__ import annotations

from typing import Any

from curl_cffi import requests as creq

_session = creq.Session(impersonate="chrome")

_BASE = "https://www.idx.co.id/primary/ListedCompany/GetFinancialReport"


def get_financial_report_list(code: str, year: int) -> list[dict[str, Any]]:
    """Daftar laporan keuangan (semua periode) untuk satu emiten pada `year`.

    Mengembalikan list record berisi periode (TW1/TW2/TW3/Audit) & URL lampiran.
    Mengembalikan list kosong bila IDX tak bisa diakses (gagal anggun).
    """
    params = {
        "indexFrom": 0,
        "pageSize": 12,
        "year": year,
        "reportType": "rdf",
        "EmitenType": "*",
        "periode": "*",
        "kodeEmiten": code.upper(),
        "SortColumn": "KodeEmiten",
        "SortOrder": "asc",
    }
    try:
        resp = _session.get(_BASE, params=params, timeout=20)
        resp.raise_for_status()
        data = resp.json()
    except Exception:  # noqa: BLE001
        return []

    out: list[dict[str, Any]] = []
    for item in data.get("Results", []):
        attachments = item.get("Attachments", []) or []
        # cari lampiran XBRL (instance.zip) bila ada
        xbrl = next(
            (a.get("Full_Path") for a in attachments
             if str(a.get("File_Name", "")).lower().endswith(".zip")),
            None,
        )
        out.append({
            "code": item.get("KodeEmiten", "").strip(),
            "year": item.get("Report_Year"),
            "period": item.get("Report_Period"),   # mis. "TW3", "Audit"
            "xbrl_url": xbrl,
            "attachments": [a.get("Full_Path") for a in attachments],
        })
    return out


def latest_report_period(code: str, year: int) -> str | None:
    """Periode laporan terbaru yang sudah dirilis (untuk deteksi laporan baru)."""
    reports = get_financial_report_list(code, year)
    if not reports:
        return None
    order = {"TW1": 1, "TW2": 2, "TW3": 3, "Audit": 4, "Tahunan": 4}
    reports.sort(key=lambda r: order.get(str(r.get("period")), 0), reverse=True)
    top = reports[0]
    return f"{top.get('year')}-{top.get('period')}" if top.get("period") else None
