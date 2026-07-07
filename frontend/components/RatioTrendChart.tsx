"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RatioPeriod } from "@/lib/api";

const SERIES = [
  { key: "gpm", name: "GPM", color: "#e3b23c" },
  { key: "opm", name: "OPM", color: "#cf8a5b" },
  { key: "npm", name: "NPM", color: "#5fa878" },
  { key: "roe", name: "ROE", color: "#d67d54" },
] as const;

export default function RatioTrendChart({ ratios }: { ratios: RatioPeriod[] }) {
  // ratios terbaru-dulu dari API → balik agar kronologis
  const data = [...ratios].reverse().map((r) => ({
    period: r.period,
    gpm: r.gpm,
    opm: r.opm,
    npm: r.npm,
    roe: r.roe,
  }));

  // sembunyikan seri yang seluruh nilainya kosong (mis. GPM/OPM untuk bank)
  const active = SERIES.filter((s) =>
    data.some((d) => d[s.key] !== null && d[s.key] !== undefined),
  );

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#443228" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="period"
          tick={{ fill: "#b3a294", fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: "#443228" }}
        />
        <YAxis
          tick={{ fill: "#b3a294", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={40}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          contentStyle={{
            background: "#251b16",
            border: "1px solid #443228",
            borderRadius: 12,
            fontSize: 12,
          }}
          formatter={(v, n) => [`${v}%`, n]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {active.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={2}
            dot={{ r: 2 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
