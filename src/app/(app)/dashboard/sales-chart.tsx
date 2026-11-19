"use client";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

// Dates are yyyy-MM-dd calendar days; format in UTC so the viewer's timezone can't shift them.
const dayFmt = (d: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(d).toLocaleDateString("en-AU", { ...opts, timeZone: "UTC" });

export function SalesChart({ data }: { data: { date: string; total: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="fillSales" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#18181b" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#18181b" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "#71717a" }}
          tickFormatter={(d) => dayFmt(d, { day: "numeric", month: "short" })}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#71717a" }}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: "1px solid #e4e4e7", fontSize: 12 }}
          labelFormatter={(d) => dayFmt(d as string, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
          formatter={(v) => [`$${Number(v ?? 0).toLocaleString()}`, "Sales"]}
        />
        <Area type="monotone" dataKey="total" stroke="#18181b" fill="url(#fillSales)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
