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
  { key: "gpm", name: "GPM", color: "#b58224" },
  { key: "opm", name: "OPM", color: "#b56a3d" },
  { key: "npm", name: "NPM", color: "#3e8e5a" },
  { key: "roe", name: "ROE", color: "#bd5d3a" },
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
        <CartesianGrid stroke="#e2d0bc" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="period"
          tick={{ fill: "#8a7565", fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: "#e2d0bc" }}
        />
        <YAxis
          tick={{ fill: "#8a7565", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={40}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          contentStyle={{
            background: "#fffdf8",
            border: "1px solid #e2d0bc",
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
