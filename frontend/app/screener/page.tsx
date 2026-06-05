"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUpDown, Building2, Search } from "lucide-react";
import { getScreener, ScreenerRow } from "@/lib/api";
import { Card, GradeBadge, ScoreBar, WarningBadge } from "@/components/ui";
import { changeColor, fmtPct, fmtPrice } from "@/lib/format";

type SortKey =
  | "score"
  | "roe"
  | "npm"
  | "earnings_growth"
  | "per"
  | "pbv"
  | "upside_pct";

const COLS: { key: SortKey; label: string }[] = [
  { key: "score", label: "Skor" },
  { key: "roe", label: "ROE" },
  { key: "npm", label: "NPM" },
  { key: "earnings_growth", label: "Laba YoY" },
  { key: "per", label: "PER" },
  { key: "pbv", label: "PBV" },
  { key: "upside_pct", label: "Upside" },
];

export default function ScreenerPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ScreenerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [bank, setBank] = useState<"all" | "bank" | "nonbank">("all");
  const [warn, setWarn] = useState<"all" | "warning" | "clean">("all");
  const [sector, setSector] = useState("all");
  const [minScore, setMinScore] = useState(0);
  const [sort, setSort] = useState<SortKey>("score");
  const [desc, setDesc] = useState(true);

  useEffect(() => {
    getScreener("?limit=200")
      .then((d) => setRows(d.rows))
      .finally(() => setLoading(false));
  }, []);

  const sectors = useMemo(
    () => Array.from(new Set(rows.map((r) => r.sector).filter(Boolean))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    let r = rows.filter((x) => (x.score ?? 0) >= minScore);
    if (bank !== "all") r = r.filter((x) => x.is_bank === (bank === "bank"));
    if (warn !== "all")
      r = r.filter((x) =>
        warn === "warning"
          ? (x.warnings?.length ?? 0) > 0
          : (x.warnings?.length ?? 0) === 0,
      );
    if (sector !== "all") r = r.filter((x) => x.sector === sector);
    if (q.trim()) {
      const s = q.toLowerCase();
      r = r.filter(
        (x) =>
          x.code.toLowerCase().includes(s) || x.name.toLowerCase().includes(s),
      );
    }
    const sentinel = desc ? -Infinity : Infinity;
    r = [...r].sort((a, b) => {
      const av = (a[sort] ?? sentinel) as number;
      const bv = (b[sort] ?? sentinel) as number;
      return desc ? bv - av : av - bv;
    });
    return r;
  }, [rows, q, bank, warn, sector, minScore, sort, desc]);

  const warnCount = useMemo(
    () => rows.filter((r) => (r.warnings?.length ?? 0) > 0).length,
    [rows],
  );

  function toggleSort(k: SortKey) {
    if (k === sort) setDesc(!desc);
    else {
      setSort(k);
      setDesc(true);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Screener Fundamental</h1>
        <p className="text-sm text-muted">
          {filtered.length} emiten lolos skor &gt;60 (dari ~760 emiten likuid IDX
          yang dianalisa) · skor DuPont: profitabilitas, pertumbuhan, tren margin
          & kualitas.
        </p>
        <p className="mt-1 text-xs text-muted">
          Grade: <span className="text-emerald-400">A</span> ≥80 ·{" "}
          <span className="text-lime-400">B</span> ≥65 ·{" "}
          <span className="text-amber-400">C</span> ≥50 ·{" "}
          <span className="text-orange-400">D</span> ≥35 ·{" "}
          <span className="text-red-400">E</span> &lt;35 ·{" "}
          <span className="text-amber-400">⚠ {warnCount} warning</span> —{" "}
          <Link href="/info" className="text-emerald-400 underline hover:no-underline">
            apa ini?
          </Link>
        </p>
      </div>

      {/* Filter bar */}
      <Card className="flex flex-wrap items-center gap-4">
        <div className="relative min-w-50 flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari kode / nama emiten…"
            className="w-full rounded-xl border border-border bg-surface-2 py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500/40"
          />
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-border bg-surface-2 p-1 text-xs">
          {(["all", "bank", "nonbank"] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBank(b)}
              className={`rounded-lg px-3 py-1.5 capitalize transition-colors ${
                bank === b
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "text-muted hover:text-text"
              }`}
            >
              {b === "all" ? "Semua" : b === "bank" ? "Bank" : "Non-bank"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-border bg-surface-2 p-1 text-xs">
          {(["all", "clean", "warning"] as const).map((b) => (
            <button
              key={b}
              onClick={() => setWarn(b)}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                warn === b
                  ? b === "warning"
                    ? "bg-amber-500/15 text-amber-400"
                    : "bg-emerald-500/15 text-emerald-400"
                  : "text-muted hover:text-text"
              }`}
            >
              {b === "all" ? "Semua" : b === "clean" ? "Aman" : `⚠ Warning (${warnCount})`}
            </button>
          ))}
        </div>

        <select
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs text-text outline-none focus:border-emerald-500/40"
        >
          <option value="all">Semua sektor</option>
          {sectors.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-xs text-muted">
          Min skor: <span className="font-mono text-text">{minScore}</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            className="accent-emerald-400"
          />
        </label>
      </Card>

      {/* Tabel */}
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3">Emiten</th>
              <th className="px-3 py-3">Sektor</th>
              <th className="px-3 py-3 text-right">Harga</th>
              {COLS.map((c) => (
                <th key={c.key} className="px-3 py-3 text-right">
                  <button
                    onClick={() => toggleSort(c.key)}
                    className={`inline-flex items-center gap-1 hover:text-text ${
                      sort === c.key ? "text-emerald-400" : ""
                    }`}
                  >
                    {c.label}
                    <ArrowUpDown size={12} />
                  </button>
                </th>
              ))}
              <th className="px-3 py-3 text-right">Hold</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} className="px-4 py-10 text-center text-muted">
                  Memuat…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-10 text-center text-muted">
                  Tidak ada emiten cocok. Sudah klik Refresh?
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr
                  key={r.code}
                  onClick={() => router.push(`/stocks/${r.code}`)}
                  className="cursor-pointer border-b border-border/60 transition-colors hover:bg-white/[0.03]"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <GradeBadge grade={r.grade} />
                      <div>
                        <div className="flex items-center gap-1.5 font-semibold">
                          {r.code}
                          {r.is_bank && (
                            <Building2 size={12} className="text-sky-400" />
                          )}
                          <WarningBadge warnings={r.warnings} />
                        </div>
                        <div className="line-clamp-1 max-w-44 text-xs text-muted">
                          {r.name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-block rounded-md bg-white/5 px-2 py-0.5 text-xs text-muted">
                      {r.sector || "—"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="font-medium tabular-nums">{fmtPrice(r.price)}</div>
                    <div className={`text-xs ${changeColor(r.change_pct)}`}>
                      {fmtPct(r.change_pct)}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end">
                      <ScoreBar score={r.score} />
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{fmtPct(r.roe)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{fmtPct(r.npm)}</td>
                  <td
                    className={`px-3 py-3 text-right tabular-nums ${changeColor(r.earnings_growth)}`}
                  >
                    {fmtPct(r.earnings_growth)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {r.per?.toFixed(1) ?? "—"}×
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {r.pbv?.toFixed(2) ?? "—"}×
                  </td>
                  <td
                    className={`px-3 py-3 text-right font-semibold tabular-nums ${
                      r.warnings?.includes("upside_ekstrem")
                        ? "text-amber-400"
                        : changeColor(r.upside_pct)
                    }`}
                  >
                    {r.warnings?.includes("upside_ekstrem") && "⚠ "}
                    {fmtPct(r.upside_pct)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-muted">
                    {r.hold_years ? `${r.hold_years} th` : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
