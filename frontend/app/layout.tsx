import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import RefreshButton from "@/components/RefreshButton";

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
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-bg/70 px-5 py-3 backdrop-blur md:px-8">
              <div className="text-sm text-muted">
                Bursa Efek Indonesia · Analisa Fundamental
              </div>
              <RefreshButton />
            </header>
            <main className="flex-1 px-5 py-6 md:px-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
