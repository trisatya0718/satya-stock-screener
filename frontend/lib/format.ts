export const fmtNum = (v?: number | null, digits = 0): string =>
  v === null || v === undefined || Number.isNaN(v)
    ? "—"
    : v.toLocaleString("id-ID", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });

export const fmtPrice = (v?: number | null): string =>
  v === null || v === undefined ? "—" : `Rp${fmtNum(v, 0)}`;

export const fmtPct = (v?: number | null, digits = 1): string =>
  v === null || v === undefined ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(digits)}%`;

export const fmtMult = (v?: number | null): string =>
  v === null || v === undefined ? "—" : `${v.toFixed(2)}×`;

export const changeColor = (v?: number | null): string =>
  v === null || v === undefined
    ? "text-muted"
    : v > 0
      ? "text-up"
      : v < 0
        ? "text-down"
        : "text-muted";

export const gradeColor = (grade: string): string => {
  switch (grade) {
    case "A":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "B":
      return "bg-lime-500/15 text-lime-400 border-lime-500/30";
    case "C":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "D":
      return "bg-orange-500/15 text-orange-400 border-orange-500/30";
    default:
      return "bg-red-500/15 text-red-400 border-red-500/30";
  }
};

export const verdictColor = (verdict: string): string => {
  switch (verdict) {
    case "BUY":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/40";
    case "WAIT":
      return "bg-amber-500/15 text-amber-400 border-amber-500/40";
    case "AVOID":
      return "bg-red-500/15 text-red-400 border-red-500/40";
    default:
      return "bg-zinc-500/15 text-zinc-400 border-zinc-500/40";
  }
};

export const timeAgo = (iso?: string | null): string => {
  if (!iso) return "belum pernah";
  const d = new Date(iso);
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} jam lalu`;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
};
