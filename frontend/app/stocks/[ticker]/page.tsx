"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Target,
  Wallet,
  Clock,
  TrendingUp,
  Info,
} from "lucide-react";
import {
  getStock,
  getPriceHistory,
  StockDetail,
  PricePoint,
} from "@/lib/api";
import { Card, GradeBadge, VerdictBadge, Stat } from "@/components/ui";
import PriceAreaChart from "@/components/PriceAreaChart";
import RatioTrendChart from "@/components/RatioTrendChart";
import { changeColor, fmtMult, fmtNum, fmtPct, fmtPrice } from "@/lib/format";

export default function StockPage() {
  const { ticker } = useParams<{ ticker: string }>();
  const code = (ticker || "").toUpperCase();
  const [d, setD] = useState<StockDetail | null>(null);
  const [hist, setHist] = useState<PricePoint[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    getStock(code).then(setD).catch((e) => setErr(String(e)));
    getPriceHistory(code).then((r) => setHist(r.history)).catch(() => {});
  }, [code]);

  if (err)
    return (
      <Card className="mx-auto max-w-2xl border-red-500/30 text-sm text-red-400">
        {err}. Coba klik Refresh untuk menarik data {code}.
      </Card>
    );
  if (!d)
    return <div className="py-20 text-center text-muted">Memuat {code}…</div>;

  const v = d.valuation;
  const up = (d.change_pct ?? 0) >= 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href="/screener"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text"
      >
        <ArrowLeft size={15} /> Kembali ke screener
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <GradeBadge grade={d.grade} />
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              {d.code}
              {d.is_bank && <Building2 size={18} className="text-sky-400" />}
            </h1>
            <p className="text-sm text-muted">
              {d.name} · {d.sector}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold tabular-nums">{fmtPrice(d.price)}</div>
          <div className={`text-sm ${changeColor(d.change_pct)}`}>
            {fmtPct(d.change_pct)} hari ini · Skor {d.score.toFixed(0)}/100
          </div>
        </div>
      </div>

      {/* Chart + Verdict */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-2 text-xs uppercase tracking-wide text-muted">
            Harga 3 Tahun
          </div>
          {hist.length > 0 ? (
            <PriceAreaChart data={hist} color={up ? "#34d399" : "#ef4444"} />
          ) : (
            <div className="flex h-[260px] items-center justify-center text-sm text-muted">
              Memuat grafik…
            </div>
          )}
        </Card>

        <Card className="flex flex-col">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-muted">
              Rekomendasi
            </span>
            <VerdictBadge verdict={v.verdict} />
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Target size={16} className="text-emerald-400" />
              <Stat label="Fair Value" value={fmtPrice(v.fair_value)} />
              <div className="ml-auto text-right">
                <div className="text-xs text-muted">Upside</div>
                <div
                  className={`text-lg font-bold tabular-nums ${changeColor(v.upside_pct)}`}
                >
                  {fmtPct(v.upside_pct)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Wallet size={16} className="text-sky-400" />
              <Stat
                label="Beli di Bawah"
                value={fmtPrice(v.buy_price)}
                sub="batas margin of safety"
              />
            </div>
            <div className="flex items-center gap-3">
              <Clock size={16} className="text-amber-400" />
              <Stat
                label="Estimasi Hold"
                value={v.hold_years ? `${v.hold_years} tahun` : "—"}
                sub="menuju fair value"
              />
            </div>
          </div>
          <div className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-muted">
            <div className="mb-1 flex items-center gap-1.5 font-medium text-text">
              <Info size={12} /> Metode:{" "}
              {v.method === "bank_justified_pbv"
                ? "Justified PBV (Gordon Growth)"
                : "PE / PB Band"}
            </div>
            <ul className="list-disc space-y-0.5 pl-4">
              {v.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      {/* Valuation multiples */}
      <Card>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
          Valuasi vs Rata-rata Historis
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="PER saat ini" value={fmtMult(v.per)} />
          <Stat label="PER rata-rata" value={fmtMult(v.per_mean)} />
          <Stat label="PBV saat ini" value={fmtMult(v.pbv)} />
          <Stat label="PBV rata-rata" value={fmtMult(v.pbv_mean)} />
          <Stat label="Justified PER" value={fmtMult(v.justified_per)} />
          <Stat label="Justified PBV" value={fmtMult(v.justified_pbv)} />
        </div>
      </Card>

      {/* DuPont */}
      <Card>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted">
          Dekomposisi DuPont
        </h2>
        <p className="mb-4 text-xs text-muted">
          ROE = Net Profit Margin × Total Asset Turnover × Equity Multiplier
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <DupontFactor label="NPM" value={fmtPct(d.dupont.npm)} />
          <span className="text-lg text-muted">×</span>
          <DupontFactor label="TATO" value={fmtMult(d.dupont.tato)} />
          <span className="text-lg text-muted">×</span>
          <DupontFactor label="Equity Mult." value={fmtMult(d.dupont.em)} />
          <span className="text-lg text-muted">=</span>
          <DupontFactor label="ROE" value={fmtPct(d.dupont.roe)} highlight />
        </div>
        {d.dupont.driver && (
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-surface-2/60 p-3 text-sm text-muted">
            <TrendingUp size={15} className="mt-0.5 shrink-0 text-emerald-400" />
            {d.dupont.driver}
          </p>
        )}
      </Card>

      {/* Bank metrics */}
      {d.is_bank && d.bank_metrics && (
        <Card>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
            Metrik Bank
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="NIM (proxy)" value={fmtPct(d.bank_metrics.nim)} />
            <Stat label="ROE" value={fmtPct(d.bank_metrics.roe)} />
            <Stat label="ROA" value={fmtPct(d.bank_metrics.roa)} />
            <Stat label="NPL" value={fmtPct(d.bank_metrics.npl)} />
            <Stat label="CAR" value={fmtPct(d.bank_metrics.car)} />
            <Stat label="BOPO" value={fmtPct(d.bank_metrics.bopo)} />
            <Stat label="LDR" value={fmtPct(d.bank_metrics.ldr)} />
            <Stat label="CASA" value={fmtPct(d.bank_metrics.casa)} />
          </div>
          <p className="mt-3 text-xs text-muted">
            NPL, CAR, BOPO, LDR & CASA memerlukan disclosure bank dari IDX (akan
            dilengkapi di iterasi berikutnya). NIM di sini proxy dari net interest
            income / total aset.
          </p>
        </Card>
      )}

      {/* Ratio trend + table */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
            Tren Margin & ROE
          </h2>
          <RatioTrendChart ratios={d.ratios} />
        </Card>
        <Card className="overflow-x-auto">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
            Rasio per Periode
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted">
                <th className="py-2 pr-2">Periode</th>
                <th className="py-2 text-right">NPM</th>
                <th className="py-2 text-right">ROA</th>
                <th className="py-2 text-right">ROE</th>
                <th className="py-2 text-right">EM</th>
              </tr>
            </thead>
            <tbody>
              {d.ratios.map((r) => (
                <tr key={r.period} className="border-b border-border/50">
                  <td className="py-2 pr-2 font-mono text-xs">{r.period}</td>
                  <td className="py-2 text-right tabular-nums">{fmtPct(r.npm)}</td>
                  <td className="py-2 text-right tabular-nums">{fmtPct(r.roa)}</td>
                  <td className="py-2 text-right tabular-nums">{fmtPct(r.roe)}</td>
                  <td className="py-2 text-right tabular-nums">{fmtMult(r.em)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <p className="pb-4 text-center text-xs text-muted">
        Update terakhir: {d.updated_at ? new Date(d.updated_at).toLocaleString("id-ID") : "—"} ·
        Bukan rekomendasi jual/beli. Lakukan riset Anda sendiri.
      </p>
    </div>
  );
}

function DupontFactor({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 text-center ${
        highlight
          ? "border-emerald-500/40 bg-emerald-500/10"
          : "border-border bg-surface-2/60"
      }`}
    >
      <div className="text-xs text-muted">{label}</div>
      <div
        className={`mt-0.5 text-lg font-bold tabular-nums ${highlight ? "text-emerald-400" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}
