// Analisa teknikal BTCUSDT — data realtime dari API publik Binance (CORS terbuka),
// indikator & sinyal dihitung di browser. Strategi: trend-following confluence
// (EMA multi-timeframe + RSI + MACD + volume) dengan SL/TP berbasis ATR dan
// support/resistance dari pivot. TANPA jaminan win-rate — lihat disclaimer di UI.

export interface Candle {
  time: number; // detik (UTC), untuk lightweight-charts
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Ticker24h {
  lastPrice: number;
  priceChange: number;
  priceChangePercent: number;
  highPrice: number;
  lowPrice: number;
  quoteVolume: number;
}

export type Interval = "15m" | "1h" | "4h" | "1d";

// timeframe konfirmasi tren (lebih besar) untuk tiap timeframe utama
export const HTF: Record<Interval, string> = {
  "15m": "4h",
  "1h": "4h",
  "4h": "1d",
  "1d": "1w",
};

// api.binance.com sering diblokir ISP Indonesia — pakai daftar host fallback.
// data-api.binance.vision = mirror resmi khusus data publik (domain berbeda).
const HOSTS = [
  "https://data-api.binance.vision/api/v3",
  "https://api.binance.com/api/v3",
  "https://api1.binance.com/api/v3",
];
let hostIdx = 0; // ingat host yang terakhir berhasil supaya tak probing terus

async function binanceFetch(path: string): Promise<Response> {
  let lastErr: unknown = null;
  for (let i = 0; i < HOSTS.length; i++) {
    const idx = (hostIdx + i) % HOSTS.length;
    try {
      const res = await fetch(`${HOSTS[idx]}${path}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        hostIdx = idx;
        return res;
      }
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Binance unreachable");
}

export async function fetchKlines(
  interval: string,
  limit = 400,
  symbol = "BTCUSDT",
): Promise<Candle[]> {
  const res = await binanceFetch(
    `/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
  );
  const rows: (string | number)[][] = await res.json();
  return rows.map((r) => ({
    time: Math.floor(Number(r[0]) / 1000),
    open: Number(r[1]),
    high: Number(r[2]),
    low: Number(r[3]),
    close: Number(r[4]),
    volume: Number(r[5]),
  }));
}

export async function fetchTicker(symbol = "BTCUSDT"): Promise<Ticker24h> {
  const res = await binanceFetch(`/ticker/24hr?symbol=${symbol}`);
  const d = await res.json();
  return {
    lastPrice: Number(d.lastPrice),
    priceChange: Number(d.priceChange),
    priceChangePercent: Number(d.priceChangePercent),
    highPrice: Number(d.highPrice),
    lowPrice: Number(d.lowPrice),
    quoteVolume: Number(d.quoteVolume),
  };
}

// ---------- Indikator ----------

export function emaSeries(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length < period) return out;
  const k = 2 / (period + 1);
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

function last<T>(arr: (T | null)[]): T | null {
  for (let i = arr.length - 1; i >= 0; i--) if (arr[i] !== null) return arr[i];
  return null;
}

export function rsiLast(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  let avgG = gain / period;
  let avgL = loss / period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgG = (avgG * (period - 1) + Math.max(d, 0)) / period;
    avgL = (avgL * (period - 1) + Math.max(-d, 0)) / period;
  }
  if (avgL === 0) return 100;
  return 100 - 100 / (1 + avgG / avgL);
}

export function atrLast(candles: Candle[], period = 14): number {
  if (candles.length < period + 1) return 0;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const pc = candles[i - 1].close;
    trs.push(Math.max(c.high - c.low, Math.abs(c.high - pc), Math.abs(c.low - pc)));
  }
  // Wilder smoothing
  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trs.length; i++) atr = (atr * (period - 1) + trs[i]) / period;
  return atr;
}

export function macdHistLast(closes: number[]): { hist: number; prevHist: number } {
  const e12 = emaSeries(closes, 12);
  const e26 = emaSeries(closes, 26);
  const macdLine: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (e12[i] !== null && e26[i] !== null) macdLine.push((e12[i] as number) - (e26[i] as number));
  }
  const sig = emaSeries(macdLine, 9);
  const n = macdLine.length;
  const histNow = n > 0 && sig[n - 1] !== null ? macdLine[n - 1] - (sig[n - 1] as number) : 0;
  const histPrev = n > 1 && sig[n - 2] !== null ? macdLine[n - 2] - (sig[n - 2] as number) : 0;
  return { hist: histNow, prevHist: histPrev };
}

// Support/resistance dari pivot high/low, dikelompokkan bila berdekatan (< 0.5×ATR).
export function swingLevels(
  candles: Candle[],
  atr: number,
  k = 5,
): { supports: number[]; resistances: number[] } {
  const price = candles[candles.length - 1]?.close ?? 0;
  const highs: number[] = [];
  const lows: number[] = [];
  for (let i = k; i < candles.length - k; i++) {
    const win = candles.slice(i - k, i + k + 1);
    const h = candles[i].high;
    const l = candles[i].low;
    if (h === Math.max(...win.map((c) => c.high))) highs.push(h);
    if (l === Math.min(...win.map((c) => c.low))) lows.push(l);
  }
  const cluster = (levels: number[]): number[] => {
    const sorted = [...levels].sort((a, b) => a - b);
    const out: number[] = [];
    let group: number[] = [];
    for (const v of sorted) {
      if (group.length === 0 || v - group[group.length - 1] < 0.5 * atr) group.push(v);
      else {
        out.push(group.reduce((a, b) => a + b, 0) / group.length);
        group = [v];
      }
    }
    if (group.length) out.push(group.reduce((a, b) => a + b, 0) / group.length);
    return out;
  };
  const all = cluster([...highs, ...lows]);
  return {
    supports: all.filter((v) => v < price).sort((a, b) => b - a).slice(0, 3),
    resistances: all.filter((v) => v > price).sort((a, b) => a - b).slice(0, 3),
  };
}

// ---------- Signal engine ----------

export interface Analysis {
  bias: "LONG" | "SHORT" | "WAIT";
  score: number; // -5..+5
  reasons: string[];
  cautions: string[];
  entry: number | null;
  stop: number | null;
  tp1: number | null;
  tp2: number | null;
  riskPct: number | null;
  rr1: number;
  rr2: number;
  rsi: number;
  atr: number;
  volumeRatio: number;
  ema20: number | null;
  ema50: number | null;
  ema200: number | null;
  htfTrendUp: boolean | null;
  supports: number[];
  resistances: number[];
  lastClose: number;
}

export function analyze(candles: Candle[], htfCandles: Candle[] | null): Analysis {
  const closes = candles.map((c) => c.close);
  const price = closes[closes.length - 1];
  const ema20 = last(emaSeries(closes, 20));
  const ema50 = last(emaSeries(closes, 50));
  const ema200 = last(emaSeries(closes, 200));
  const rsi = rsiLast(closes);
  const atr = atrLast(candles);
  const { hist, prevHist } = macdHistLast(closes);
  const vols = candles.map((c) => c.volume);
  const vol20 = vols.slice(-21, -1).reduce((a, b) => a + b, 0) / 20;
  const volumeRatio = vol20 > 0 ? vols[vols.length - 1] / vol20 : 1;
  const { supports, resistances } = swingLevels(candles, atr || price * 0.005);

  let htfTrendUp: boolean | null = null;
  if (htfCandles && htfCandles.length >= 60) {
    const hCloses = htfCandles.map((c) => c.close);
    const hEma50 = last(emaSeries(hCloses, 50));
    if (hEma50 !== null) htfTrendUp = hCloses[hCloses.length - 1] > hEma50;
  }

  // --- skor confluence (-5..+5) ---
  let score = 0;
  const reasons: string[] = [];
  const cautions: string[] = [];

  if (ema50 !== null) {
    if (price > ema50) { score += 1; reasons.push("Harga di atas EMA50 (tren naik)"); }
    else { score -= 1; reasons.push("Harga di bawah EMA50 (tren turun)"); }
  }
  if (ema50 !== null && ema200 !== null) {
    if (ema50 > ema200) { score += 1; reasons.push("Struktur bullish (EMA50 > EMA200)"); }
    else { score -= 1; reasons.push("Struktur bearish (EMA50 < EMA200)"); }
  }
  if (hist > 0) { score += 1; reasons.push(hist > prevHist ? "MACD positif & menguat" : "MACD positif"); }
  else { score -= 1; reasons.push(hist < prevHist ? "MACD negatif & melemah" : "MACD negatif"); }
  if (rsi >= 55) { score += 1; reasons.push(`RSI ${rsi.toFixed(0)} (momentum naik)`); }
  else if (rsi <= 45) { score -= 1; reasons.push(`RSI ${rsi.toFixed(0)} (momentum turun)`); }
  if (htfTrendUp !== null) {
    if (htfTrendUp) { score += 1; reasons.push("Timeframe besar searah naik"); }
    else { score -= 1; reasons.push("Timeframe besar searah turun"); }
  }

  if (rsi > 75) cautions.push("RSI overbought (>75) — rawan koreksi, hindari kejar harga");
  if (rsi < 25) cautions.push("RSI oversold (<25) — rawan technical rebound melawan short");
  if (ema20 !== null && atr > 0 && price > ema20 + 1.5 * atr)
    cautions.push("Harga extended jauh di atas EMA20 — lebih aman menunggu pullback");
  if (volumeRatio < 0.7) cautions.push("Volume tipis — sinyal kurang terkonfirmasi");

  // --- keputusan & level ---
  let bias: Analysis["bias"] = "WAIT";
  if (score >= 3 && rsi < 78) bias = "LONG";
  else if (score <= -3 && rsi > 22) bias = "SHORT";

  let entry: number | null = null;
  let stop: number | null = null;
  let tp1: number | null = null;
  let tp2: number | null = null;
  let riskPct: number | null = null;
  const rr1 = 1.5;
  const rr2 = 2.5;

  if (bias !== "WAIT" && atr > 0) {
    entry = price;
    const risk = 1.5 * atr;
    if (bias === "LONG") {
      stop = entry - risk;
      // snap TP1 ke resistance terdekat bila jaraknya masuk akal (0.8–2 × risk)
      const snap = resistances.find((r) => r > entry! + 0.8 * risk && r < entry! + 2 * risk);
      tp1 = snap ?? entry + rr1 * risk;
      tp2 = entry + rr2 * risk;
    } else {
      stop = entry + risk;
      const snap = supports.find((s) => s < entry! - 0.8 * risk && s > entry! - 2 * risk);
      tp1 = snap ?? entry - rr1 * risk;
      tp2 = entry - rr2 * risk;
    }
    riskPct = (risk / entry) * 100;
  }

  return {
    bias, score, reasons, cautions,
    entry, stop, tp1, tp2, riskPct, rr1, rr2,
    rsi, atr, volumeRatio,
    ema20, ema50, ema200,
    htfTrendUp, supports, resistances,
    lastClose: price,
  };
}

// ---------- Sentimen (Fear & Greed Index, alternative.me — gratis & CORS terbuka) ----------

export interface FearGreed {
  value: number; // 0..100
  label: string; // "Extreme Fear" ... "Extreme Greed"
}

export async function fetchFearGreed(): Promise<FearGreed | null> {
  try {
    const res = await fetch("https://api.alternative.me/fng/?limit=1", {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const d = await res.json();
    const row = d?.data?.[0];
    if (!row) return null;
    return { value: Number(row.value), label: String(row.value_classification) };
  } catch {
    return null;
  }
}

// Catatan sentimen kontrarian: ekstrem greed melemahkan LONG, ekstrem fear
// melemahkan SHORT (rawan rebound). Dipakai sebagai lapisan konteks, bukan sinyal.
export function sentimentNotes(fg: FearGreed | null, bias: Analysis["bias"]): string[] {
  if (!fg) return [];
  const notes: string[] = [];
  if (fg.value >= 75 && bias === "LONG")
    notes.push(`Fear & Greed ${fg.value} (${fg.label}) — pasar serakah, rawan koreksi; kecilkan posisi`);
  if (fg.value <= 25 && bias === "SHORT")
    notes.push(`Fear & Greed ${fg.value} (${fg.label}) — pasar takut ekstrem, rawan rebound melawan short`);
  return notes;
}

export const fmtUsd = (v?: number | null, digits = 0): string =>
  v === null || v === undefined
    ? "—"
    : `$${v.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
