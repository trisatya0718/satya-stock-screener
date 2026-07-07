"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Target,
  TrendingUp,
  TrendingDown,
  PauseCircle,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { Card, Badge } from "@/components/ui";
import CryptoChart from "@/components/CryptoChart";
import {
  analyze,
  fetchKlines,
  fetchTicker,
  fetchFearGreed,
  sentimentNotes,
  fmtUsd,
  Analysis,
  Candle,
  FearGreed,
  HTF,
  Interval,
  Ticker24h,
} from "@/lib/crypto";

const INTERVALS: Interval[] = ["15m", "1h", "4h", "1d"];
const POLL_MS = 30_000;

export default function CryptoPage() {
  const [interval_, setInterval_] = useState<Interval>("1h");
  const [candles, setCandles] = useState<Candle[]>([]);
  const [ticker, setTicker] = useState<Ticker24h | null>(null);
  const [fg, setFg] = useState<FearGreed | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (iv: Interval) => {
    try {
      const [main, htf, tk, sentiment] = await Promise.all([
        fetchKlines(iv, 400),
        fetchKlines(HTF[iv], 250),
        fetchTicker(),
        fetchFearGreed(),
      ]);
      setCandles(main);
      setTicker(tk);
      setFg(sentiment);
      setAnalysis(analyze(main, htf));
      setUpdatedAt(new Date());
      setErr(null);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load(interval_);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => load(interval_), POLL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [interval_, load]);

  const up = (ticker?.priceChangePercent ?? 0) >= 0;
  const a = analysis;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* Header harga live */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">BTC / USDT</h1>
          <p className="text-sm text-muted">
            Analisa teknikal live · update tiap 30 detik
            {updatedAt && ` · terakhir ${updatedAt.toLocaleTimeString("id-ID")}`} ·{" "}
            <Link href="/info" className="text-amber-400 underline hover:no-underline">
              disclaimer
            </Link>
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold tabular-nums">
            {fmtUsd(ticker?.lastPrice)}
          </div>
          <div className={`text-sm font-semibold ${up ? "text-up" : "text-down"}`}>
            {up ? "+" : ""}
            {ticker?.priceChangePercent?.toFixed(2) ?? "—"}% (24 jam)
          </div>
        </div>
      </div>

      {err && (
        <Card className="border-red-500/30 text-sm text-red-400">
          Gagal memuat data Binance: {err}. Coba muat ulang — atau API Binance tidak
          terjangkau dari jaringan Anda.
        </Card>
      )}

      {/* Chart + panel sinyal */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 rounded-xl border border-border bg-surface-2 p-1 text-xs">
              {INTERVALS.map((iv) => (
                <button
                  key={iv}
                  onClick={() => setInterval_(iv)}
                  className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
                    interval_ === iv
                      ? "bg-amber-500/15 text-amber-400"
                      : "text-muted hover:text-text"
                  }`}
                >
                  {iv}
                </button>
              ))}
            </div>
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              live 30s · EMA20 <span className="text-sky-400">▬</span> EMA50{" "}
              <span className="text-violet-400">▬</span>
            </span>
          </div>
          {candles.length > 0 ? (
            <CryptoChart candles={candles} analysis={a} />
          ) : (
            <div className="flex h-[420px] items-center justify-center text-sm text-muted">
              {loading ? "Memuat grafik…" : "Tidak ada data."}
            </div>
          )}
        </Card>

        {/* Panel sinyal */}
        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-muted">
                Sinyal ({interval_})
              </span>
              {a && <BiasBadge bias={a.bias} />}
            </div>

            {a && a.bias !== "WAIT" && a.entry && a.stop ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface-2/60 p-3">
                  <LevelStat label="Entry" value={fmtUsd(a.entry)} icon={<Target size={12} className="text-sky-400" />} />
                  <LevelStat
                    label={`Stop Loss (−${a.riskPct?.toFixed(1)}%)`}
                    value={fmtUsd(a.stop)}
                    valueClass="text-down"
                  />
                  <LevelStat
                    label={`TP1 (RR ~${a.rr1})`}
                    value={fmtUsd(a.tp1)}
                    valueClass="text-up"
                  />
                  <LevelStat
                    label={`TP2 (RR ${a.rr2})`}
                    value={fmtUsd(a.tp2)}
                    valueClass="text-up"
                  />
                </div>
                <p className="text-xs leading-relaxed text-muted">
                  Saran umum: amankan sebagian di TP1, sisanya menuju TP2 dengan SL
                  digeser ke entry (breakeven). Batalkan setup bila candle menutup
                  melewati SL.
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded-xl bg-surface-2/60 p-3 text-sm text-muted">
                <PauseCircle size={16} className="mt-0.5 shrink-0 text-amber-400" />
                Sinyal belum cukup kuat (confluence lemah / pasar ranging). Lebih aman
                menunggu — tidak ada posisi juga merupakan keputusan.
              </div>
            )}
          </Card>

          <Card>
            <div className="mb-2 text-xs uppercase tracking-wide text-muted">
              Confluence ({a ? `skor ${a.score > 0 ? "+" : ""}${a.score}` : "—"})
            </div>
            <ul className="space-y-1.5 text-xs">
              {a?.reasons.map((r) => (
                <li key={r} className="flex items-start gap-1.5 text-muted">
                  {r.includes("turun") || r.includes("bearish") || r.includes("negatif") ? (
                    <TrendingDown size={13} className="mt-0.5 shrink-0 text-down" />
                  ) : (
                    <TrendingUp size={13} className="mt-0.5 shrink-0 text-up" />
                  )}
                  {r}
                </li>
              ))}
            </ul>
            {a && [...a.cautions, ...sentimentNotes(fg, a.bias)].length > 0 && (
              <div className="mt-3 space-y-1 border-t border-border pt-2">
                {[...a.cautions, ...sentimentNotes(fg, a.bias)].map((c) => (
                  <div key={c} className="flex items-start gap-1.5 text-xs text-amber-400">
                    <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                    {c}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <div className="mb-2 text-xs uppercase tracking-wide text-muted">
              Indikator
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <Metric label="RSI (14)" value={a?.rsi.toFixed(1)} />
              <Metric label="ATR (14)" value={fmtUsd(a?.atr)} />
              <Metric label="Volume" value={a ? `${a.volumeRatio.toFixed(2)}×` : "—"} />
              <Metric
                label={`Tren ${HTF[interval_]}`}
                value={a?.htfTrendUp === null ? "—" : a?.htfTrendUp ? "Naik" : "Turun"}
                valueClass={a?.htfTrendUp ? "text-up" : "text-down"}
              />
              <Metric label="EMA50" value={fmtUsd(a?.ema50)} />
              <Metric label="EMA200" value={fmtUsd(a?.ema200)} />
              <Metric
                label="Fear & Greed"
                value={fg ? `${fg.value} · ${fg.label}` : "—"}
                valueClass={
                  !fg ? "" : fg.value <= 25 ? "text-down" : fg.value >= 75 ? "text-up" : "text-amber-400"
                }
              />
            </div>
            {a && (a.supports.length > 0 || a.resistances.length > 0) && (
              <div className="mt-3 space-y-1.5 border-t border-border pt-2.5 text-xs">
                {a.resistances.map((r, i) => (
                  <div key={`r${i}`} className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted">
                      <span className="inline-block h-0.5 w-4 rounded bg-down" />
                      Resistance {i + 1}
                    </span>
                    <span className="font-medium tabular-nums text-down">{fmtUsd(r)}</span>
                  </div>
                ))}
                {a.supports.map((s, i) => (
                  <div key={`s${i}`} className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted">
                      <span className="inline-block h-0.5 w-4 rounded bg-up" />
                      Support {i + 1}
                    </span>
                    <span className="font-medium tabular-nums text-up">{fmtUsd(s)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <p className="flex items-center justify-center gap-1.5 pb-4 text-center text-xs text-muted">
        <AlertTriangle size={12} className="text-amber-400" />
        Strategi: trend-following confluence (EMA + RSI + MACD + volume + S/R, SL/TP
        via ATR). Bukan ajakan beli/jual — kelola risiko Anda sendiri.
      </p>
    </div>
  );
}

function BiasBadge({ bias }: { bias: Analysis["bias"] }) {
  const cls =
    bias === "LONG"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
      : bias === "SHORT"
        ? "border-red-500/40 bg-red-500/10 text-red-400"
        : "border-amber-500/40 bg-amber-500/10 text-amber-400";
  return <Badge className={`${cls} px-3 py-1 text-sm font-bold`}>{bias}</Badge>;
}

function LevelStat({
  label,
  value,
  icon,
  valueClass = "",
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted">
        {icon}
        {label}
      </div>
      <div className={`mt-0.5 font-semibold tabular-nums ${valueClass}`}>{value}</div>
    </div>
  );
}

function Metric({
  label,
  value,
  valueClass = "",
}: {
  label: string;
  value?: string | null;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted">{label}</span>
      <span className={`font-medium tabular-nums ${valueClass}`}>{value ?? "—"}</span>
    </div>
  );
}
