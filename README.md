# SahamScope — Screener & Analisa Fundamental Saham IDX

Web app untuk memonitor dan menganalisa **fundamental saham Indonesia (Bursa Efek
Indonesia)**. Dua langkah inti:

1. **Screening** — dari universe emiten, cari yang fundamentalnya bagus memakai
   dekomposisi **DuPont** (GPM, OPM, NPM, TATO, ROA, EM, ROE) + pertumbuhan & tren
   margin beberapa kuartal/tahun, diringkas jadi satu **fundamental score (0–100)**.
2. **Valuasi** — apakah layak dibeli sekarang, di harga berapa, dan berapa lama
   proyeksi hold. Memakai **PE Band / PB Band** historis + **justified PER/PBV**.
   Saham **bank** dinilai berbeda: **justified PBV = (ROE − g) / (r − g)** (Gordon
   Growth) + metrik bank.

Dashboard menampilkan **grafik & harga IHSG** terkini. UI dark, minimalis, modern.

> ⚠️ Bukan rekomendasi jual/beli. Data harga dari Yahoo Finance bersifat *delayed*.

---

## Arsitektur

```
backend/   FastAPI + Python  — data, analisa, API
frontend/  Next.js 16 + Tailwind v4 — UI
```

- **Sumber data (hybrid):** [yfinance] untuk harga, IHSG (`^JKSE`), dan laporan
  keuangan kuartalan/tahunan; **IDX (idx.co.id)** untuk deteksi laporan baru &
  (rencana) memperdalam history via XBRL.
- **Cache:** SQLite (`backend/data/cache.db`) — analisa & data mentah disimpan agar
  bisa dihitung ulang offline tanpa fetch ulang.
- **Universe:** seluruh emiten **likuid IDX** (papan Main + Development, ~760) dari
  endpoint resmi IDX; yang **ditampilkan hanya skor > 60**. Sektor & bank dideteksi
  dari yfinance `industry`/`sector`.
- **Metrik bank:** NIM, CIR, ROE, ROA dihitung otomatis. NPL/CAR/CASA/LDR/BOPO diisi
  manual via `backend/data/bank_manual.csv` (kolom `code,npl,car,casa,ldr,bopo`).

### Alur analisa
`provider → ratios (DuPont) → score / banking → valuation → cache → API → UI`

| Modul | Isi |
|---|---|
| `app/analysis/ratios.py` | GPM/OPM/NPM/TATO/ROA/EM/ROE (TTM + per-periode), growth YoY, DuPont |
| `app/analysis/score.py` | fundamental score non-bank (profitabilitas, growth, tren margin, kualitas, konsistensi) |
| `app/analysis/banking.py` | metrik bank (NIM, ROE, ROA, …) + skor bank |
| `app/analysis/valuation.py` | PE/PB band (median + outlier filter), justified PER/PBV, fair value, buy price, hold, verdict |

---

## Menjalankan

Prasyarat: **Python 3.9+** dan **Node.js 18+**.

### 1. Backend (port 8000)
```bash
cd backend
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
./venv/bin/uvicorn app.main:app --reload --port 8000
```

### 2. Frontend (port 3000)
```bash
cd frontend
npm install
npm run dev
```
Buka http://localhost:3000

### 3. Isi data
Klik tombol **Refresh** di kanan atas (atau `curl -X POST localhost:8000/api/refresh`).
Backend akan menarik & menganalisa seluruh universe (~1–2 menit), lalu UI terisi.

---

## API

| Endpoint | Fungsi |
|---|---|
| `GET /api/market/ihsg` | Nilai & history IHSG |
| `GET /api/market/overview` | Breadth pasar, skor rata-rata |
| `GET /api/screener?sort=&min_score=&bank=` | Daftar emiten + skor + rasio |
| `GET /api/stocks/{code}` | Detail: DuPont, rasio, metrik bank, valuasi |
| `GET /api/stocks/{code}/valuation` | Valuasi & verdict saja |
| `POST /api/refresh` | Refresh data (async, thread latar) |
| `GET /api/refresh/status` | Status refresh + last update |

---

## Metodologi valuasi (ringkas)

- **Cost of equity** r = rf + β·ERP, dengan lantai 10% & spread (r−g) ≥ 3% agar
  Gordon Growth tidak meledak. **g** = ROE × retention, dibatasi.
- **Non-bank:** fair value = (blend median PER historis & justified PER) × EPS TTM.
- **Bank:** fair value = (blend justified PBV & median PBV historis) × BVPS.
- **Buy price:** batas "beli di bawah" = diskon ke fair value / −1σ band.
- **Hold:** ≈ ln(fair/price) / ln(1 + expected return).
- Outlier multiple (tahun laba ~nol, data Yahoo rusak) difilter; band pakai median.

---

## Batasan & Roadmap

- **Metrik bank NPL/CAR/CASA/LDR/BOPO** belum terisi (butuh disclosure IDX). NIM
  saat ini *proxy* (net interest income / total aset).
- **History PE/PB band** masih dangkal (~4 tahun dari yfinance) → upside bisa
  optimis saat pasar de-rating.
- **IDX XBRL** (`app/data/providers/idx_provider.py`): deteksi laporan baru sudah
  ada; **parsing XBRL mendalam** (history panjang + metrik bank) adalah langkah
  berikutnya.
- Berikutnya: perluas universe ke seluruh emiten, scheduler auto-refresh harian
  (APScheduler), dan watchlist.

[yfinance]: https://github.com/ranaroussi/yfinance
