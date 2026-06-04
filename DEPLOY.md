# Deploy gratis (Vercel + GitHub Actions)

Arsitektur produksi = **situs statis** di Vercel + **auto-refresh data** via GitHub
Actions. Tidak ada server yang perlu selalu nyala → cepat di HP, murni gratis.

```
GitHub Actions (cron)  ──run──►  backend/generate_static.py  ──tulis──►  frontend/public/data/*.json
        │                                                                        │
        └──commit & push──►  GitHub  ──auto-deploy──►  Vercel  ◄──buka dari HP──┘
```

## Langkah sekali setup

### 1. Push ke GitHub
Repo lokal sudah di-`git init` + commit. Buat repo kosong di github.com (mis.
`satya-stock-screener`), lalu:

```bash
cd "Stock Screener Project"
git remote add origin https://github.com/<username>/satya-stock-screener.git
git branch -M main
git push -u origin main
```

### 2. Deploy frontend ke Vercel
1. Masuk ke https://vercel.com → **Add New → Project** → import repo GitHub tadi.
2. **Root Directory: `frontend`** (penting — klik Edit, pilih folder `frontend`).
3. Framework otomatis terdeteksi **Next.js**. Biarkan default.
4. Klik **Deploy**. Selesai → kamu dapat URL `https://<nama>.vercel.app`.

`.env.production` (sudah ada di repo) otomatis mengaktifkan `NEXT_PUBLIC_STATIC=1`,
jadi situs membaca `/data/*.json`. Buka URL itu dari HP — langsung jalan.

### 3. Aktifkan auto-refresh (GitHub Actions)
Workflow `.github/workflows/refresh-data.yml` sudah ada. Agar bot bisa commit data:
- Repo → **Settings → Actions → General → Workflow permissions** →
  pilih **Read and write permissions** → Save.
- Coba jalankan manual: tab **Actions → "Refresh data saham" → Run workflow**.
  Setelah selesai, ia commit JSON baru → Vercel redeploy → data fresh.

Jadwal default (WIB): **08:00**, **12:00**, **16:30** hari kerja. Ubah baris `cron`
di workflow bila mau lebih sering (waktu UTC, WIB = UTC+7).

## Catatan
- Vercel redeploy **otomatis** tiap kali Actions push data baru — tak perlu klik.
- GitHub menonaktifkan cron bila repo idle >60 hari; cukup buka/commit sesekali.
- Yahoo kadang rate-limit IP cloud; workflow sudah pakai retry + `curl_cffi`. Bila
  satu run gagal sebagian, run berikutnya menambal.
- Mau jalan lokal dengan backend live (bukan statis)? Hapus `NEXT_PUBLIC_STATIC=1`
  di `frontend/.env.local`, lalu jalankan backend + `npm run dev`.
