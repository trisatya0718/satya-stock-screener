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
  Bell,
  BellOff,
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
  SymbolCfg,
  SYMBOLS,
  Ticker24h,
} from "@/lib/crypto";

const INTERVALS: Interval[] = ["15m", "1h", "4h", "1d"];
const POLL_MS = 30_000;

export default function CryptoPage() {
  const [interval_, setInterval_] = useState<Interval>("1h");
  const [sym, setSym] = useState<SymbolCfg>(SYMBOLS[0]);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [ticker, setTicker] = useState<Ticker24h | null>(null);
  const [fg, setFg] = useState<FearGreed | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifOn, setNotifOn] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setNotifOn(
      typeof Notification !== "undefined" &&
        Notification.permission === "granted" &&
        localStorage.getItem("btcNotif") === "1",
    );
  }, []);

  async function toggleNotif() {
    if (typeof Notification === "undefined") {
      alert(
        "Browser ini tidak mendukung notifikasi web (mis. Safari iPhone). Pakai notifikasi Telegram — cek tab Info.",
      );
      return;
    }
    if (notifOn) {
      localStorage.setItem("btcNotif", "0");
      setNotifOn(false);
      return;
    }
    const p = await Notification.requestPermission();
    if (p === "granted") {
      localStorage.setItem("btcNotif", "1");
      setNotifOn(true);
      new Notification("Notifikasi sinyal aktif", {
        body: "Kamu akan diberi tahu saat muncul sinyal BTC/USDT & XAU/USD (selama tab ini terbuka).",
        icon: "/icon-192.png",
      });
    }
  }

  // Notifikasi browser saat bias BERUBAH menjadi LONG/SHORT (tab harus terbuka).
  function maybeNotify(a2: Analysis, iv: Interval, s: SymbolCfg) {
    try {
      const key = `lastBias_${s.key}`;
      const prev = localStorage.getItem(key) ?? "WAIT";
      if (a2.bias === prev) return;
      localStorage.setItem(key, a2.bias);
      const on =
        typeof Notification !== "undefined" &&
        Notification.permission === "granted" &&
        localStorage.getItem("btcNotif") === "1";
      if (on && a2.bias !== "WAIT" && a2.entry && a2.stop) {
        new Notification(`Sinyal ${a2.bias} — ${s.label} (${iv})`, {
          body: `Entry ${fmtUsd(a2.entry)} · SL ${fmtUsd(a2.stop)} · TP1 ${fmtUsd(a2.tp1)}. Bukan rekomendasi — pakai stop loss.`,
          icon: "/icon-192.png",
        });
      }
    } catch {
      /* Notification API bisa tak tersedia — abaikan */
    }
  }

  const load = useCallback(async (iv: Interval, s: SymbolCfg) => {
    try {
      const [main, htf, tk, sentiment] = await Promise.all([
        fetchKlines(iv, 400, s.api),
        fetchKlines(HTF[iv], 250, s.api),
        fetchTicker(s.api),
        s.fgRelevant ? fetchFearGreed() : Promise.resolve(null),
      ]);
      setCandles(main);
      setTicker(tk);
      setFg(sentiment);
      const a2 = analyze(main, htf);
      setAnalysis(a2);
      maybeNotify(a2, iv, s);
      setUpdatedAt(new Date());
      setErr(null);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLoading(true);
    setCandles([]);
    setAnalysis(null);
    load(interval_, sym);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => load(interval_, sym), POLL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [interval_, sym, load]);

  const up = (ticker?.priceChangePercent ?? 0) >= 0;
  const a = analysis;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* Header harga live */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{sym.label}</h1>
            <select
              value={sym.key}
              onChange={(e) =>
                setSym(SYMBOLS.find((s) => s.key === e.target.value) ?? SYMBOLS[0])
              }
              className="rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-sm font-medium text-text outline-none focus:border-terra/40"
            >
              {SYMBOLS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.key === "XAUUSD" ? "XAUUSD (Emas)" : s.key}
                </option>
              ))}
            </select>
          </div>
          <p className="text-sm text-muted">
            Analisa teknikal live · update tiap 30 detik
            {updatedAt && ` · terakhir ${updatedAt.toLocaleTimeString("id-ID")}`} ·{" "}
            <Link href="/info" className="text-terra underline hover:no-underline">
              disclaimer
            </Link>
            {sym.note && (
              <span className="block text-xs text-muted/80">{sym.note}</span>
            )}
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
        <Card className="border-red-500/30 text-sm text-red-600">
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
                      ? "bg-terra/15 text-terra"
                      : "text-muted hover:text-text"
                  }`}
                >
                  {iv}
                </button>
              ))}
            </div>
            <span className="flex items-center gap-2 text-xs text-muted">
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              live 30s
              <button
                onClick={toggleNotif}
                title="Notifikasi sinyal (browser desktop; iPhone: pakai Telegram)"
                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 transition-colors ${
                  notifOn
                    ? "border-terra/40 bg-terra/10 text-terra"
                    : "border-border text-muted hover:text-text"
                }`}
              >
                {notifOn ? <Bell size={12} /> : <BellOff size={12} />} Notif
              </button>
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
                  <LevelStat label="Entry" value={fmtUsd(a.entry)} icon={<Target size={12} className="text-terra" />} />
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
                <PauseCircle size={16} className="mt-0.5 shrink-0 text-amber-600" />
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
                  <div key={c} className="flex items-start gap-1.5 text-xs text-amber-600">
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
              {sym.fgRelevant && (
              <Metric
                label="Fear & Greed"
                value={fg ? `${fg.value} · ${fg.label}` : "—"}
                valueClass={
                  !fg ? "" : fg.value <= 25 ? "text-down" : fg.value >= 75 ? "text-up" : "text-amber-600"
                }
              />
              )}
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

    </div>
  );
}

function BiasBadge({ bias }: { bias: Analysis["bias"] }) {
  const cls =
    bias === "LONG"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
      : bias === "SHORT"
        ? "border-red-500/40 bg-red-500/10 text-red-600"
        : "border-amber-500/40 bg-amber-500/10 text-amber-600";
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
