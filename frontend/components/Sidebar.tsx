"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Filter, Info, Activity, Bitcoin } from "lucide-react";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/screener", label: "Screener", icon: Filter },
  { href: "/trading", label: "Trading", icon: Activity },
  { href: "/crypto", label: "Crypto · BTC", icon: Bitcoin },
  { href: "/info", label: "Info & Catatan", icon: Info },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-surface/60 px-4 py-6 md:flex">
      <Link href="/" className="mb-8 px-2 font-serif">
        <div className="text-base font-bold leading-tight tracking-tight">
          <span className="text-terra">Satya</span> Stock Screener
        </div>
        <div className="text-[11px] text-muted">Fundamental & teknikal IDX</div>
      </Link>

      <nav className="flex flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-terra/10 text-terra"
                  : "text-muted hover:bg-white/5 hover:text-text"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      <p className="mt-auto px-2 text-[11px] leading-relaxed text-muted">
        Analisa DuPont + valuasi PE/PB band. Data delayed via Yahoo Finance — bukan
        rekomendasi jual/beli.
      </p>
    </aside>
  );
}
