"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, Sparkles, Building2 } from "lucide-react";
import {
  getIhsg,
  getOverview,
  getScreener,
  IhsgResponse,
  MarketOverview,
  ScreenerRow,
} from "@/lib/api";
import { Card, GradeBadge } from "@/components/ui";
import PriceAreaChart from "@/components/PriceAreaChart";
import { changeColor, fmtNum, fmtPct, fmtPrice } from "@/lib/format";

export default function Dashboard() {
  const [ihsg, setIhsg] = useState<IhsgResponse | null>(null);
  const [ov, setOv] = useState<MarketOverview | null>(null);
  const [picks, setPicks] = useState<ScreenerRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getIhsg(), getOverview(), getScreener()])
      .then(([i, o, s]) => {
        setIhsg(i);
        setOv(o);
        // Top picks: skor tinggi, TANPA warning (valuasi andal), diurut upside.
        const top = s.rows
          .filter((r) => (r.score ?? 0) >= 60 && (r.warnings?.length ?? 0) === 0)
          .sort((a, b) => (b.upside_pct ?? -1e9) - (a.upside_pct ?? -1e9))
          .slice(0, 6);
        setPicks(top);
      })
      .catch((e) => setErr(String(e)));
  }, []);

  const up = (ihsg?.change ?? 0) >= 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted">
          Ringkasan pasar & saham fundamental terbaik
          {ov?.total_analyzed
            ? ` — ${ov.total_emiten} lolos skor >60 dari ${ov.total_analyzed} emiten dianalisa`
            : " (emiten IDX likuid)"}
          .
        </p>
      </div>

      {err && (
        <Card className="border-red-500/30 text-sm text-red-400">
          Gagal memuat data: {err}. Pastikan backend berjalan & sudah di-Refresh.
        </Card>
      )}

      {/* IHSG + overview */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-3 flex items-start justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted">
                IHSG · Indeks Harga Saham Gabungan
              </div>
              <div className="mt-1 flex items-baseline gap-3">
                <span className="text-3xl font-bold tabular-nums">
                  {fmtNum(ihsg?.last, 2)}
                </span>
                <span
                  className={`flex items-center gap-1 text-sm font-semibold ${changeColor(ihsg?.change)}`}
                >
                  {up ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                  {fmtNum(ihsg?.change, 2)} ({fmtPct(ihsg?.change_pct)})
                </span>
              </div>
            </div>
          </div>
          {ihsg && ihsg.history.length > 0 ? (
            <PriceAreaChart
              data={ihsg.history}
              color={up ? "#34d399" : "#ef4444"}
            />
          ) : (
            <div className="flex h-[260px] items-center justify-center text-sm text-muted">
              Memuat grafik…
            </div>
          )}
        </Card>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
          <Card>
            <div className="text-xs uppercase tracking-wide text-muted">
              Breadth Pasar
            </div>
            <div className="mt-3 flex items-end gap-4">
              <div>
                <div className="text-2xl font-bold text-up">{ov?.advancers ?? "—"}</div>
                <div className="text-xs text-muted">Naik</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-down">{ov?.decliners ?? "—"}</div>
                <div className="text-xs text-muted">Turun</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-muted">{ov?.unchanged ?? "—"}</div>
                <div className="text-xs text-muted">Tetap</div>
              </div>
            </div>
          </Card>
          <Card>
            <div className="text-xs uppercase tracking-wide text-muted">
              Skor Fundamental Rata-rata
            </div>
            <div className="mt-2 text-3xl font-bold tabular-nums text-emerald-400">
              {ov?.avg_score ?? "—"}
            </div>
            <div className="text-xs text-muted">
              dari {ov?.total_emiten ?? 0} emiten lolos skor &gt;60
            </div>
          </Card>
        </div>
      </div>

      {/* Top picks */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Sparkles size={18} className="text-emerald-400" />
          <h2 className="text-lg font-semibold">Top Picks</h2>
          <span className="text-sm text-muted">
            skor ≥ 60, diurut upside tertinggi
          </span>
        </div>
        {picks.length === 0 ? (
          <Card className="text-sm text-muted">
            Belum ada data. Klik <b className="text-text">Refresh</b> di kanan atas
            untuk menarik & menganalisa laporan keuangan.
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {picks.map((r) => (
              <Link key={r.code} href={`/stocks/${r.code}`}>
                <Card className="transition-colors hover:border-emerald-500/40">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold">{r.code}</span>
                        {r.is_bank && (
                          <Building2 size={14} className="text-sky-400" />
                        )}
                      </div>
                      <div className="line-clamp-1 text-xs text-muted">{r.name}</div>
                    </div>
                    <GradeBadge grade={r.grade} />
                  </div>
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <div className="text-xl font-semibold tabular-nums">
                        {fmtPrice(r.price)}
                      </div>
                      <div className={`text-xs ${changeColor(r.change_pct)}`}>
                        {fmtPct(r.change_pct)} hari ini
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted">Upside</div>
                      <div className="text-lg font-bold tabular-nums text-emerald-400">
                        {fmtPct(r.upside_pct)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-muted">
                    <span>ROE {fmtPct(r.roe)}</span>
                    <span>PER {r.per?.toFixed(1) ?? "—"}×</span>
                    <span>PBV {r.pbv?.toFixed(2) ?? "—"}×</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
