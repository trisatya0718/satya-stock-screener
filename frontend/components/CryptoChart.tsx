"use client";

import { useEffect, useRef } from "react";
import type { Candle, Analysis } from "@/lib/crypto";
import { emaSeries } from "@/lib/crypto";

// Chart candlestick BTCUSDT (lightweight-charts v5) + overlay EMA20/50,
// garis Entry/SL/TP saat ada sinyal, dan level support/resistance.
export default function CryptoChart({
  candles,
  analysis,
  height = 420,
}: {
  candles: Candle[];
  analysis: Analysis | null;
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  // simpan instance antar-render supaya data bisa di-update tanpa rebuild chart
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const emaRefs = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const priceLinesRef = useRef<any[]>([]);

  // buat chart sekali
  useEffect(() => {
    let disposed = false;
    (async () => {
      const { createChart, CandlestickSeries, LineSeries } = await import(
        "lightweight-charts"
      );
      if (disposed || !containerRef.current) return;

      const chart = createChart(containerRef.current, {
        height,
        layout: {
          background: { color: "transparent" },
          textColor: "#8a7565",
          attributionLogo: false,
        },
        grid: {
          vertLines: { color: "rgba(150,120,95,0.25)" },
          horzLines: { color: "rgba(150,120,95,0.25)" },
        },
        rightPriceScale: { borderColor: "#e2d0bc" },
        timeScale: { borderColor: "#e2d0bc", timeVisible: true },
        crosshair: { mode: 0 },
        autoSize: true,
      });
      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: "#5fa878",
        downColor: "#e25549",
        borderUpColor: "#5fa878",
        borderDownColor: "#e25549",
        wickUpColor: "#5fa878",
        wickDownColor: "#e25549",
      });
      const ema20Series = chart.addSeries(LineSeries, {
        color: "#b58224",
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      const ema50Series = chart.addSeries(LineSeries, {
        color: "#8d7264",
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });

      chartRef.current = chart;
      seriesRef.current = candleSeries;
      emaRefs.current = [ema20Series, ema50Series];
    })();
    return () => {
      disposed = true;
      chartRef.current?.remove();
      chartRef.current = null;
      seriesRef.current = null;
      emaRefs.current = [];
      priceLinesRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // update data + garis level tiap candles/analysis berubah
  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart || candles.length === 0) {
      // chart mungkin belum jadi (import async) — coba lagi sebentar
      const t = setTimeout(() => {
        if (seriesRef.current && candles.length > 0) update();
      }, 300);
      return () => clearTimeout(t);
    }
    update();

    function update() {
      const s = seriesRef.current;
      if (!s) return;
      s.setData(
        candles.map((c) => ({
          time: c.time, open: c.open, high: c.high, low: c.low, close: c.close,
        })),
      );
      const closes = candles.map((c) => c.close);
      const [e20s, e50s] = emaRefs.current;
      const toLine = (vals: (number | null)[]) =>
        vals
          .map((v, i) => (v === null ? null : { time: candles[i].time, value: v }))
          .filter(Boolean);
      e20s?.setData(toLine(emaSeries(closes, 20)));
      e50s?.setData(toLine(emaSeries(closes, 50)));

      // bersihkan garis lama lalu gambar ulang
      for (const pl of priceLinesRef.current) s.removePriceLine(pl);
      priceLinesRef.current = [];
      const addLine = (
        price: number, color: string, title: string, style = 0, width = 1,
      ) => {
        priceLinesRef.current.push(
          s.createPriceLine({
            price, color, lineWidth: width, lineStyle: style,
            axisLabelVisible: true, title,
          }),
        );
      };
      if (analysis) {
        if (analysis.bias !== "WAIT" && analysis.entry && analysis.stop) {
          addLine(analysis.entry, "#3b2c22", "Entry", 0, 2);
          addLine(analysis.stop, "#e25549", "Stop Loss", 0, 2);
          if (analysis.tp1) addLine(analysis.tp1, "#5fa878", "TP1", 0, 2);
          if (analysis.tp2) addLine(analysis.tp2, "#5fa878", "TP2", 0, 2);
        }
        // Resistance merah / Support hijau, bernomor dari yang terdekat harga
        analysis.resistances.forEach((r, i) =>
          addLine(r, "rgba(201,74,53,0.9)", `Resistance ${i + 1}`, 2),
        );
        analysis.supports.forEach((sp, i) =>
          addLine(sp, "rgba(62,142,90,0.9)", `Support ${i + 1}`, 2),
        );
      }
    }
  }, [candles, analysis]);

  return <div ref={containerRef} style={{ height }} className="w-full" />;
}
