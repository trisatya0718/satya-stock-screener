"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Filter, LineChart, TrendingUp, Info } from "lucide-react";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/screener", label: "Screener", icon: Filter },
  { href: "/info", label: "Info & Catatan", icon: Info },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-surface/40 px-4 py-6 backdrop-blur md:flex">
      <Link href="/" className="mb-8 flex items-center gap-2 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-black">
          <TrendingUp size={20} strokeWidth={2.5} />
        </div>
        <div>
          <div className="text-[13px] font-bold leading-tight">
            Satya Stock Screener
          </div>
          <div className="text-[10px] text-muted">IDX Fundamental</div>
        </div>
      </Link>

      <nav className="flex flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "text-muted hover:bg-white/5 hover:text-text"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-xl border border-border bg-surface-2/50 p-3 text-[11px] leading-relaxed text-muted">
        <LineChart size={14} className="mb-1 text-emerald-400" />
        Analisa fundamental DuPont + valuasi PE/PB band. Data delayed via Yahoo
        Finance — bukan rekomendasi jual/beli.
      </div>
    </aside>
  );
}
