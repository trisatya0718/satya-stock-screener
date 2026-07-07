"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PricePoint } from "@/lib/api";

export default function PriceAreaChart({
  data,
  color = "#34d399",
  height = 260,
}: {
  data: PricePoint[];
  color?: string;
  height?: number;
}) {
  const chartData = data.map((p) => ({ date: p.date, close: p.close }));
  const id = `g-${color.replace("#", "")}`;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          tick={{ fill: "#8a7565", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          minTickGap={48}
          tickFormatter={(d) =>
            new Date(String(d)).toLocaleDateString("id-ID", {
              month: "short",
              year: "2-digit",
            })
          }
        />
        <YAxis
          domain={["auto", "auto"]}
          tick={{ fill: "#8a7565", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={48}
          tickFormatter={(v) => Number(v).toLocaleString("id-ID")}
        />
        <Tooltip
          contentStyle={{
            background: "#fffdf8",
            border: "1px solid #e2d0bc",
            borderRadius: 12,
            fontSize: 12,
          }}
          labelStyle={{ color: "#8a7565" }}
          formatter={(v) => [Number(v).toLocaleString("id-ID"), "Close"]}
          labelFormatter={(d) =>
            new Date(String(d)).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          }
        />
        <Area
          type="monotone"
          dataKey="close"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${id})`}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
