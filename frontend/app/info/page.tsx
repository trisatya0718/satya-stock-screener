import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui";
import { WARNING_INFO } from "@/lib/api";

export const metadata = {
  title: "Info & Catatan — Satya Stock Screener",
};

export default function InfoPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Info & Catatan</h1>
        <p className="text-sm text-muted">
          Cara membaca data, arti tanda peringatan, dan batasan metode. Penting
          dibaca sebelum mengambil keputusan.
        </p>
      </div>

      <Card>
        <h2 className="mb-2 text-base font-semibold">Cara kerja singkat</h2>
        <p className="text-sm leading-relaxed text-muted">
          Dari ~760 emiten likuid IDX (papan Utama + Pengembangan), tiap emiten
          dianalisa fundamentalnya lalu diberi <b className="text-text">skor 0–100</b>{" "}
          (dekomposisi DuPont: profitabilitas, pertumbuhan, tren margin, kualitas).
          Hanya yang <b className="text-text">skor &gt; 60</b> ditampilkan. Lalu
          dihitung valuasi (PE/PB band + justified PER/PBV; bank pakai justified PBV)
          untuk memperkirakan harga wajar, upside, dan lama hold.
        </p>
        <div className="mt-3 text-sm text-muted">
          Grade: <span className="text-emerald-400">A</span> ≥80 ·{" "}
          <span className="text-lime-400">B</span> ≥65 ·{" "}
          <span className="text-amber-400">C</span> ≥50 ·{" "}
          <span className="text-orange-400">D</span> ≥35 ·{" "}
          <span className="text-red-400">E</span> &lt;35
        </div>
      </Card>

      <Card className="border-amber-500/30">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-amber-400">
          <AlertTriangle size={18} /> Tanda Peringatan (Warning)
        </h2>
        <p className="mb-3 text-sm text-muted">
          Saham warning <b className="text-text">tetap ditampilkan</b> di screener
          (bisa difilter lewat tombol “⚠ Warning”), tapi diberi tanda karena
          valuasi/skornya perlu diperlakukan hati-hati:
        </p>
        <div className="space-y-3">
          {Object.entries(WARNING_INFO).map(([k, v]) => (
            <div key={k} className="rounded-xl bg-surface-2/60 p-3">
              <div className="text-sm font-semibold text-amber-400">{v.label}</div>
              <div className="text-sm text-muted">{v.desc}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">
          Top Picks di Dashboard sengaja <b className="text-text">mengecualikan</b>{" "}
          saham warning agar yang tampil bervaluasi lebih andal.
        </p>
      </Card>

      <Card>
        <h2 className="mb-2 text-base font-semibold">Kenapa PER / PBV kadang “—”?</h2>
        <p className="text-sm leading-relaxed text-muted">
          Nilai sengaja disembunyikan saat datanya tidak masuk akal, agar tidak
          menyesatkan:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
          <li>
            <b className="text-text">Data sumber rusak</b> — mis. emiten yang melapor
            dalam USD (harga Rupiah) membuat PBV jadi liar (ribuan ×). Nilai di luar
            batas wajar (PER &gt;300×, PBV &gt;100×) dibuang.
          </li>
          <li>
            <b className="text-text">Multiple ekstrem</b> — saham yang dihargai sangat
            tinggi (PER ratusan ×) dianggap outlier.
          </li>
          <li>
            <b className="text-text">Emiten rugi</b> — PER tak bermakna bila laba
            negatif.
          </li>
        </ul>
      </Card>

      <Card>
        <h2 className="mb-2 text-base font-semibold">Metodologi & rumus</h2>
        <ul className="space-y-1.5 text-sm text-muted">
          <li><b className="text-text">NPM</b> = Laba Bersih ÷ Pendapatan (TTM)</li>
          <li><b className="text-text">ROA</b> = Laba Bersih (TTM) ÷ Total Aset</li>
          <li><b className="text-text">ROE</b> = Laba Bersih (TTM) ÷ Ekuitas — cek silang via DuPont (NPM × Perputaran Aset × Equity Multiplier)</li>
          <li><b className="text-text">GPM / OPM</b> = Laba Kotor / Laba Operasi ÷ Pendapatan</li>
          <li><b className="text-text">Valuasi</b> = blend PER/PBV rata-rata historis (median, outlier dibuang) &amp; justified PER/PBV (Gordon Growth)</li>
          <li><b className="text-text">Bank</b> = justified PBV (ROE−g)/(r−g); NIM &amp; CIR dihitung otomatis; NPL/CAR/CASA/LDR/BOPO via input manual</li>
        </ul>
        <p className="mt-3 text-sm text-muted">
          TTM = jumlah 4 kuartal terakhir (untuk laba/pendapatan), posisi terkini
          (untuk aset/ekuitas). Data dari laporan keuangan kuartalan &amp; tahunan yang
          dilaporkan emiten (via Yahoo Finance), ter-update saat laporan baru terbit.
        </p>
      </Card>

      <Card className="border-amber-500/30">
        <h2 className="mb-2 text-base font-semibold text-amber-400">
          Tab Trading (sinyal swing)
        </h2>
        <p className="text-sm leading-relaxed text-muted">
          Tab <b className="text-text">Trading</b> berbeda dari screener fundamental:
          ia mencari setup teknikal jangka pendek (~1–3 hari) dari ~760 emiten likuid,
          memakai tren (MA20/MA50), breakout, lonjakan volume, RSI, dan{" "}
          <b className="text-text">ATR</b> untuk Entry / Stop Loss / Take Profit dengan
          risk:reward 1:2. Maksimal 10 setup/hari.
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
          <li><b className="text-text">Spekulatif & risiko tinggi</b> — bukan rekomendasi.</li>
          <li>Tidak ada jaminan win rate; target realistis &gt;60% hanya dengan disiplin stop loss.</li>
          <li>Berbasis data harian (bukan intraday) & belum memakai berita.</li>
        </ul>
      </Card>

      <Card className="border-border">
        <h2 className="mb-2 text-base font-semibold">Batasan</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
          <li>Kedalaman histori ~4 tahun → PE/PB band & pertumbuhan bisa kurang presisi untuk saham kecil.</li>
          <li>NIM & CIR bank adalah <i>proxy</i>; NPL/CAR/CASA/LDR/BOPO diisi manual.</li>
          <li>Harga Yahoo bersifat <i>delayed</i> (bukan realtime); data di-refresh otomatis terjadwal.</li>
          <li>
            <b className="text-text">Bukan rekomendasi jual/beli.</b> Selalu lakukan
            riset Anda sendiri.
          </li>
        </ul>
      </Card>
    </div>
  );
}
