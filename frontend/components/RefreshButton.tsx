"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { getRefreshStatus, triggerRefresh, STATIC } from "@/lib/api";

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RefreshButton() {
  const [running, setRunning] = useState(false);
  const [last, setLast] = useState<string | null>(null);
  const [cached, setCached] = useState<number>(0);

  async function poll() {
    try {
      const s = await getRefreshStatus();
      setRunning(s.running);
      setLast(s.last_refresh);
      setCached(s.cached_emiten);
      return s.running;
    } catch {
      return false;
    }
  }

  useEffect(() => {
    poll();
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(async () => {
      const stillRunning = await poll();
      if (!stillRunning) {
        clearInterval(id);
        if (typeof window !== "undefined") window.location.reload();
      }
    }, 3000);
    return () => clearInterval(id);
  }, [running]);

  async function onClick() {
    if (STATIC) {
      window.location.reload();
      return;
    }
    if (running) return;
    setRunning(true);
    await triggerRefresh();
    poll();
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <button
        onClick={onClick}
        disabled={running}
        title={STATIC ? "Data diperbarui otomatis terjadwal" : "Tarik & analisa data terbaru"}
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3.5 py-1.5 text-sm font-medium text-text transition-colors hover:border-terra/40 hover:text-terra disabled:opacity-60"
      >
        <RefreshCw size={14} className={running ? "animate-spin" : ""} />
        {STATIC ? "Muat ulang" : running ? "Memproses" : "Refresh"}
      </button>
      <span className="text-[10px] text-muted">
        {running ? `Memperbarui… (${cached} emiten)` : `Last updated: ${fmtDateTime(last)}`}
      </span>
    </div>
  );
}
