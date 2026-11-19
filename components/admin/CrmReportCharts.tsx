"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { LeadStatus, MonthlyRevenue, PipelineValueByStage } from "@/lib/admin/queries";

/* Glass palette — these charts only render inside the admin's frosted-sky shell. */
const COLORS = ["#e6f6ff", "#8fd3ff", "#3fa2f0", "#c4e9ff", "#5ab8f5", "#b9cfe2"];

export function LeadFunnelChart({ stats }: { stats: Record<LeadStatus, number> }) {
  const data = (["new", "contacted", "qualified", "converted", "lost"] as LeadStatus[]).map((status) => ({
    status,
    count: stats[status],
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff26" vertical={false} />
          <XAxis dataKey="status" tick={{ fontSize: 12, fill: "#ffffffcc" }} tickLine={false} axisLine={{ stroke: "#ffffff26" }} />
          <YAxis tick={{ fontSize: 12, fill: "#ffffffcc" }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #ffffff33", background: "#10294a", color: "#ffffff", fontSize: 13 }} cursor={{ fill: "#ffffff14" }} />
          <Bar dataKey="count" radius={[8, 8, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={entry.status} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PipelineValueChart({ stages, noDataLabel }: { stages: PipelineValueByStage[]; noDataLabel: string }) {
  if (stages.length === 0) return <p className="text-sm text-soft/60">{noDataLabel}</p>;
  const data = stages.map((s) => ({ stage: s.stageName, valueUsd: s.totalAmountCents / 100 }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff26" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 12, fill: "#ffffffcc" }}
            tickLine={false}
            axisLine={{ stroke: "#ffffff26" }}
            tickFormatter={(v) => `$${v}`}
          />
          <YAxis type="category" dataKey="stage" width={120} tick={{ fontSize: 11, fill: "#ffffffcc" }} tickLine={false} axisLine={false} />
          <Tooltip
            formatter={(value) => [`$${Number(value).toFixed(2)}`, "Value"]}
            contentStyle={{ borderRadius: 12, border: "1px solid #ffffff33", background: "#10294a", color: "#ffffff", fontSize: 13 }}
            cursor={{ fill: "#ffffff14" }}
          />
          <Bar dataKey="valueUsd" radius={[0, 8, 8, 0]}>
            {data.map((entry, i) => (
              <Cell key={entry.stage} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MonthlyRevenueChart({ months, noDataLabel }: { months: MonthlyRevenue[]; noDataLabel: string }) {
  if (months.length === 0) return <p className="text-sm text-soft/60">{noDataLabel}</p>;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={months} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff26" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#ffffffcc" }} tickLine={false} axisLine={{ stroke: "#ffffff26" }} />
          <YAxis tick={{ fontSize: 12, fill: "#ffffffcc" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
          <Tooltip
            formatter={(value) => [`$${Number(value).toFixed(2)}`, "Revenue"]}
            contentStyle={{ borderRadius: 12, border: "1px solid #ffffff33", background: "#10294a", color: "#ffffff", fontSize: 13 }}
            cursor={{ fill: "#ffffff14" }}
          />
          <Bar dataKey="amountUsd" radius={[8, 8, 0, 0]} fill={COLORS[0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
