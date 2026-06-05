import { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { gradeColor, verdictColor } from "@/lib/format";
import { WARNING_INFO } from "@/lib/api";

export function WarningBadge({ warnings }: { warnings?: string[] }) {
  if (!warnings || warnings.length === 0) return null;
  const reasons = warnings
    .map((w) => WARNING_INFO[w]?.label ?? w)
    .join(", ");
  return (
    <span
      title={`Warning: ${reasons}`}
      className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400"
    >
      <AlertTriangle size={11} />
      {warnings.length}
    </span>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`card p-5 ${className}`}>{children}</div>;
}

export function Badge({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}

export function GradeBadge({ grade }: { grade: string }) {
  return (
    <span
      className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border text-sm font-bold ${gradeColor(grade)}`}
    >
      {grade}
    </span>
  );
}

export function VerdictBadge({ verdict }: { verdict: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-lg border px-3 py-1 text-sm font-bold tracking-wide ${verdictColor(verdict)}`}
    >
      {verdict}
    </span>
  );
}

export function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 65 ? "bg-emerald-400" : score >= 50 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/8">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(100, score)}%` }}
        />
      </div>
      <span className="font-mono text-xs tabular-nums text-muted">
        {score.toFixed(0)}
      </span>
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  valueClass = "",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  valueClass?: string;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-1 text-lg font-semibold tabular-nums ${valueClass}`}>
        {value}
      </div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  );
}
