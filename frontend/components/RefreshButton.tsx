"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { getRefreshStatus, triggerRefresh, STATIC } from "@/lib/api";
import { timeAgo } from "@/lib/format";

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
        // segarkan data halaman setelah refresh selesai
        if (typeof window !== "undefined") window.location.reload();
      }
    }, 3000);
    return () => clearInterval(id);
  }, [running]);

  async function onClick() {
    // Mode statis: data diperbarui otomatis oleh jadwal (GitHub Actions);
    // tombol hanya memuat ulang snapshot terbaru.
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
    <div className="flex items-center gap-3">
      <span className="hidden text-xs text-muted sm:inline">
        {STATIC
          ? `Auto-update · ${timeAgo(last)}`
          : running
            ? `Memperbarui… (${cached} emiten)`
            : `Update: ${timeAgo(last)}`}
      </span>
      <button
        onClick={onClick}
        disabled={running}
        title={STATIC ? "Data diperbarui otomatis secara terjadwal" : "Tarik & analisa data terbaru"}
        className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3.5 py-2 text-sm font-medium text-text transition-colors hover:border-emerald-500/40 hover:text-emerald-400 disabled:opacity-60"
      >
        <RefreshCw size={15} className={running ? "animate-spin" : ""} />
        {STATIC ? "Muat ulang" : running ? "Memproses" : "Refresh"}
      </button>
    </div>
  );
}
