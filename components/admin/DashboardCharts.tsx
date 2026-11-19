"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const COLORS = ["#1e1e1e", "#0047ab", "#6b6b6b", "#e3a72f", "#7fa6e8", "#b8b0a6"];

/** "glass" is for the spatial Overview — white type and sky-blue bars on dark frosted glass. */
export type ChartTone = "light" | "glass";

const SKY_COLORS = ["#e6f6ff", "#8fd3ff", "#3fa2f0", "#c4e9ff", "#5ab8f5", "#b9cfe2"];

function palette(tone: ChartTone) {
  return tone === "glass"
    ? { bars: SKY_COLORS, ink: "#ffffffcc", grid: "#ffffff26", cursor: "#ffffff14" }
    : { bars: COLORS, ink: "#1e1e1e", grid: "#1e1e1e1f", cursor: "#ebdfd1" };
}

export function ChannelBreakdownChart({ sessionsByChannel, tone = "light" }: { sessionsByChannel: Record<string, number>; tone?: ChartTone }) {
  const p = palette(tone);
  const data = Object.entries(sessionsByChannel).map(([channel, count]) => ({ channel, count }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={p.grid} vertical={false} />
          <XAxis dataKey="channel" tick={{ fontSize: 12, fill: p.ink }} tickLine={false} axisLine={{ stroke: p.grid }} />
          <YAxis tick={{ fontSize: 12, fill: p.ink }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: "1px solid #1e1e1e22", background: "#ffffff", color: "#1e1e1e", fontSize: 13 }}
            cursor={{ fill: p.cursor }}
          />
          <Bar dataKey="count" radius={[8, 8, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={entry.channel} fill={p.bars[i % p.bars.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CostByModelChart({ byModel, tone = "light" }: { byModel: Array<{ model: string; costUsd: number }>; tone?: ChartTone }) {
  const p = palette(tone);
  if (byModel.length === 0) {
    return <p className={tone === "glass" ? "text-sm text-white/70" : "text-sm text-soft/60"}>No model usage recorded yet this month.</p>;
  }

  const data = [...byModel].sort((a, b) => b.costUsd - a.costUsd).slice(0, 8);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={p.grid} horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 12, fill: p.ink }} tickLine={false} axisLine={{ stroke: p.grid }} tickFormatter={(v) => `$${v.toFixed(2)}`} />
          <YAxis type="category" dataKey="model" width={160} tick={{ fontSize: 11, fill: p.ink }} tickLine={false} axisLine={false} />
          <Tooltip
            formatter={(value) => [`$${Number(value).toFixed(4)}`, "Est. cost"]}
            contentStyle={{ borderRadius: 12, border: "1px solid #1e1e1e22", background: "#ffffff", color: "#1e1e1e", fontSize: 13 }}
            cursor={{ fill: p.cursor }}
          />
          <Bar dataKey="costUsd" radius={[0, 8, 8, 0]}>
            {data.map((entry, i) => (
              <Cell key={entry.model} fill={p.bars[i % p.bars.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
