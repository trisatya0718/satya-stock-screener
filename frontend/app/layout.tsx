import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import RefreshButton from "@/components/RefreshButton";
import { TrendingUp } from "lucide-react";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Satya Stock Screener — Fundamental Saham IDX",
  description:
    "Monitor & analisa fundamental saham Indonesia: screening DuPont, valuasi PE/PB band, dan justified PBV untuk bank.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div className="flex">
          <Sidebar />
          <div className="flex min-h-screen flex-1 flex-col">
            <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-bg/70 px-4 py-3 backdrop-blur md:px-8">
              {/* Brand di mobile (sidebar tersembunyi), teks pasar di desktop */}
              <div className="flex items-center gap-2 md:hidden">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 text-black">
                  <TrendingUp size={16} strokeWidth={2.5} />
                </div>
                <span className="text-sm font-bold leading-tight">Satya Stock Screener</span>
              </div>
              <div className="hidden text-sm text-muted md:block">
                Bursa Efek Indonesia · Analisa Fundamental
              </div>
              <RefreshButton />
            </header>
            <main className="flex-1 px-4 py-6 pb-24 md:px-8 md:pb-6">{children}</main>
          </div>
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
