"use client";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { format } from "date-fns";

export function DailyChart({ data }: { data: { date: string; net: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "#71717a" }}
          tickFormatter={(d) => format(new Date(d), "d MMM")}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#71717a" }}
          tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(1)}k`}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: "1px solid #e4e4e7", fontSize: 12 }}
          labelFormatter={(d) => format(new Date(d as string), "EEE, d MMM yyyy")}
          formatter={(v) => [`$${Number(v ?? 0).toLocaleString()}`, "Net"]}
        />
        <Bar dataKey="net" radius={[3, 3, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.net < 0 ? "#dc2626" : "#18181b"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
