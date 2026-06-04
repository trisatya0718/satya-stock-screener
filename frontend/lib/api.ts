// Klien API. Dua mode:
//  - STATIC (produksi/Vercel): baca file JSON statis di /data/ yang dihasilkan
//    GitHub Actions terjadwal. Tak butuh backend selalu nyala.
//  - LIVE (dev lokal): panggil backend FastAPI di API_BASE.
export const STATIC = process.env.NEXT_PUBLIC_STATIC === "1";
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function getStatic<T>(file: string): Promise<T> {
  const res = await fetch(`/data/${file}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export async function postJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { method: "POST" });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// ---- Tipe ----
export interface PricePoint {
  date: string;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  close: number;
  volume?: number | null;
}

export interface IhsgResponse {
  symbol: string;
  last: number;
  change: number;
  change_pct: number;
  prev_close: number;
  history: PricePoint[];
  updated_at: string | null;
}

export interface MarketOverview {
  ihsg_last: number;
  ihsg_change_pct: number;
  advancers: number;
  decliners: number;
  unchanged: number;
  avg_score: number;
  total_emiten: number;
  updated_at: string | null;
}

export interface ScreenerRow {
  code: string;
  name: string;
  sector: string;
  is_bank: boolean;
  price?: number | null;
  change_pct?: number | null;
  score: number;
  grade: string;
  roe?: number | null;
  roa?: number | null;
  npm?: number | null;
  revenue_growth?: number | null;
  earnings_growth?: number | null;
  per?: number | null;
  pbv?: number | null;
  upside_pct?: number | null;
  hold_years?: number | null;
  verdict?: string | null;
}

export interface ScreenerResponse {
  rows: ScreenerRow[];
  count: number;
  updated_at: string | null;
}

export interface RatioPeriod {
  period: string;
  gpm?: number | null;
  opm?: number | null;
  npm?: number | null;
  tato?: number | null;
  roa?: number | null;
  em?: number | null;
  roe?: number | null;
  revenue?: number | null;
  net_income?: number | null;
}

export interface Valuation {
  method: string;
  price?: number | null;
  fair_value?: number | null;
  buy_price?: number | null;
  upside_pct?: number | null;
  per?: number | null;
  pbv?: number | null;
  per_mean?: number | null;
  pbv_mean?: number | null;
  justified_per?: number | null;
  justified_pbv?: number | null;
  hold_years?: number | null;
  verdict: string;
  notes: string[];
}

export interface BankMetrics {
  nim?: number | null;
  npl?: number | null;
  casa?: number | null;
  car?: number | null;
  bopo?: number | null;
  ldr?: number | null;
  roe?: number | null;
  roa?: number | null;
}

export interface DupontBreakdown {
  npm?: number | null;
  tato?: number | null;
  em?: number | null;
  roe?: number | null;
  driver?: string | null;
}

export interface StockDetail {
  code: string;
  name: string;
  sector: string;
  is_bank: boolean;
  price?: number | null;
  change_pct?: number | null;
  score: number;
  grade: string;
  dupont: DupontBreakdown;
  bank_metrics?: BankMetrics | null;
  ratios: RatioPeriod[];
  valuation: Valuation;
  updated_at?: string | null;
}

export interface RefreshStatus {
  running: boolean;
  last_refresh: string | null;
  cached_emiten: number;
  last_result: { refreshed: number; failed: string[] } | null;
}

// ---- Endpoint (bercabang STATIC vs LIVE) ----
export const getIhsg = () =>
  STATIC
    ? getStatic<IhsgResponse>("market/ihsg.json")
    : getJSON<IhsgResponse>("/api/market/ihsg");

export const getOverview = () =>
  STATIC
    ? getStatic<MarketOverview>("market/overview.json")
    : getJSON<MarketOverview>("/api/market/overview");

// Di mode statis seluruh daftar dibaca sekali; query string diabaikan (frontend
// memfilter & menyortir sendiri).
export const getScreener = (qs = "") =>
  STATIC
    ? getStatic<ScreenerResponse>("screener.json")
    : getJSON<ScreenerResponse>(`/api/screener${qs}`);

export const getStock = (code: string) =>
  STATIC
    ? getStatic<StockDetail>(`stocks/${code.toUpperCase()}.json`)
    : getJSON<StockDetail>(`/api/stocks/${code}`);

export const getPriceHistory = async (code: string) => {
  if (STATIC) {
    const d = await getStatic<StockDetail & { price_history?: PricePoint[] }>(
      `stocks/${code.toUpperCase()}.json`,
    );
    return { code: code.toUpperCase(), history: d.price_history ?? [] };
  }
  return getJSON<{ code: string; history: PricePoint[] }>(
    `/api/stocks/${code}/price-history`,
  );
};

export const getRefreshStatus = async (): Promise<RefreshStatus> => {
  if (STATIC) {
    const m = await getStatic<{ updated_at: string; ok: number }>("meta.json");
    return {
      running: false,
      last_refresh: m.updated_at,
      cached_emiten: m.ok,
      last_result: null,
    };
  }
  return getJSON<RefreshStatus>("/api/refresh/status");
};

export const triggerRefresh = () =>
  STATIC
    ? Promise.resolve({ status: "static" })
    : postJSON<{ status: string }>("/api/refresh");
