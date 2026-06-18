"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  TrendingUp,
  Target,
  ShieldAlert,
  Activity,
} from "lucide-react";
import { getTrading, TradingPick } from "@/lib/api";
import { Card, Badge } from "@/components/ui";
import { changeColor, fmtPct, fmtPrice, timeAgo } from "@/lib/format";

export default function TradingPage() {
  const [picks, setPicks] = useState<TradingPick[]>([]);
  const [updated, setUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTrading()
      .then((d) => {
        setPicks(d.picks);
        setUpdated(d.updated_at);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Activity size={22} className="text-amber-400" /> Trading Setup
        </h1>
        <p className="text-sm text-muted">
          Sinyal swing teknikal (horizon ~1–3 hari) · diperbarui {timeAgo(updated)} ·
          maks 10 setup terbaik dari ~760 emiten likuid.
        </p>
      </div>

      {/* DISCLAIMER */}
      <Card className="border-amber-500/50 bg-amber-500/[0.07]">
        <div className="flex items-start gap-3">
          <ShieldAlert size={20} className="mt-0.5 shrink-0 text-amber-400" />
          <div className="space-y-1.5 text-sm">
            <div className="font-semibold text-amber-400">
              Disclaimer — wajib dibaca
            </div>
            <ul className="list-disc space-y-1 pl-4 text-muted">
              <li>
                Ini <b className="text-text">sinyal teknikal spekulatif</b>, BUKAN
                rekomendasi jual/beli. Risiko tinggi — bisa rugi.
              </li>
              <li>
                <b className="text-text">Tidak ada jaminan win rate.</b> Target
                realistis &gt;60% hanya tercapai bila disiplin pakai stop loss & money
                management. Banyak setup tetap akan gagal.
              </li>
              <li>
                Berbasis data harga <b className="text-text">harian (delayed)</b>, bukan
                intraday realtime. <b className="text-text">Belum mempertimbangkan berita</b>{" "}
                (sumber berita gratis andal tidak tersedia).
              </li>
              <li>
                Selalu pasang <b className="text-text">Stop Loss</b>, jangan over-leverage,
                pakai dana yang siap hilang. Keputusan & risiko sepenuhnya milik Anda.
              </li>
            </ul>
            <Link href="/info" className="inline-block pt-1 text-emerald-400 underline hover:no-underline">
              Baca metodologi & batasan →
            </Link>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="py-16 text-center text-muted">Memuat setup…</div>
      ) : picks.length === 0 ? (
        <Card className="text-sm text-muted">
          Tidak ada setup yang memenuhi syarat hari ini (pasar mungkin sedang lemah —
          sedikit saham yang uptrend). Coba lagi setelah refresh berikutnya.
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {picks.map((p, i) => (
            <Card key={p.code} className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted">#{i + 1}</span>
                    <Link
                      href={`/stocks/${p.code}`}
                      className="text-lg font-bold hover:text-emerald-400"
                    >
                      {p.code}
                    </Link>
                    <Badge className="border-amber-500/40 bg-amber-500/10 text-amber-400">
                      setup {p.setup_score}
                    </Badge>
                  </div>
                  <div className="line-clamp-1 text-xs text-muted">
                    {p.name} · {p.sector || "—"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold tabular-nums">{fmtPrice(p.price)}</div>
                  <div className={`text-xs ${changeColor(p.change_pct)}`}>
                    {fmtPct(p.change_pct)}
                  </div>
                </div>
              </div>

              {/* Entry / SL / TP */}
              <div className="grid grid-cols-3 gap-2 rounded-xl bg-surface-2/60 p-3 text-center">
                <div>
                  <div className="flex items-center justify-center gap-1 text-[10px] uppercase text-muted">
                    <Target size={11} className="text-sky-400" /> Entry
                  </div>
                  <div className="mt-0.5 font-semibold tabular-nums">{fmtPrice(p.entry)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-muted">Stop Loss</div>
                  <div className="mt-0.5 font-semibold tabular-nums text-down">
                    {fmtPrice(p.stop_loss)}
                  </div>
                  <div className="text-[10px] text-down">−{p.risk_pct}%</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-muted">Take Profit</div>
                  <div className="mt-0.5 font-semibold tabular-nums text-up">
                    {fmtPrice(p.take_profit)}
                  </div>
                  <div className="text-[10px] text-up">+{p.reward_pct}%</div>
                </div>
              </div>

              {/* metrik */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                <span>
                  Risk:Reward <b className="text-text">1 : {p.rr}</b>
                </span>
                <span>
                  Volume <b className="text-text">{p.volume_ratio}×</b>
                </span>
                <span>
                  RSI <b className="text-text">{p.rsi}</b>
                </span>
              </div>

              {/* sinyal */}
              <div className="flex flex-wrap gap-1.5">
                {p.signals.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-400"
                  >
                    <TrendingUp size={10} />
                    {s}
                  </span>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="flex items-center justify-center gap-1.5 pb-4 text-center text-xs text-muted">
        <AlertTriangle size={12} className="text-amber-400" />
        Bukan ajakan jual/beli. Trading saham berisiko tinggi — selalu riset & kelola
        risiko Anda sendiri.
      </p>
    </div>
  );
}
