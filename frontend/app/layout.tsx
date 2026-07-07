import type { Metadata } from "next";
import { Lora, Source_Sans_3, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import RefreshButton from "@/components/RefreshButton";

// Serif hangat untuk judul, sans humanis untuk isi — kesan editorial, bukan "AI".
const serif = Lora({ variable: "--font-lora", subsets: ["latin"], weight: ["600", "700"] });
const sans = Source_Sans_3({ variable: "--font-ss3", subsets: ["latin"] });
const mono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500"] });

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
      className={`${serif.variable} ${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div className="flex">
          <Sidebar />
          <div className="flex min-h-screen flex-1 flex-col">
            <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-bg/70 px-4 py-3 backdrop-blur md:px-8">
              {/* Brand di mobile (sidebar tersembunyi), teks pasar di desktop */}
              <div className="md:hidden">
                <span className="font-serif text-sm font-bold leading-tight">
                  <span className="text-terra">Satya</span> Stock Screener
                </span>
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
