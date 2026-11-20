"use client";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from "recharts";
import { money } from "@/lib/format";

// Validated pair (light surface): blue = sales, orange = expenses.
const SALES = "#2a78d6";
const EXPENSES = "#eb6834";

export type BreakEvenPoint = { date: string; sales: number | null; expenses: number | null };

// Dates are yyyy-MM-dd calendar days; format in UTC so the viewer's timezone can't shift them.
const dayFmt = (d: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(d).toLocaleDateString("en-AU", { ...opts, timeZone: "UTC" });

function TooltipBody({ active, payload }: { active?: boolean; payload?: { payload: BreakEvenPoint }[] }) {
  const p = payload?.[0]?.payload;
  if (!active || !p || p.sales === null || p.expenses === null) return null;
  const gap = p.sales - p.expenses;
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-sm">
      <div className="font-medium text-zinc-900 mb-1">
        {dayFmt(p.date, { weekday: "short", day: "numeric", month: "short" })}
      </div>
      <div className="flex items-center gap-2 text-zinc-700">
        <span className="h-0.5 w-3 rounded" style={{ background: SALES }} /> Sales {money(p.sales)}
      </div>
      <div className="flex items-center gap-2 text-zinc-700">
        <span className="h-0.5 w-3 rounded" style={{ background: EXPENSES }} /> Expenses {money(p.expenses)}
      </div>
      <div className="mt-1 border-t border-zinc-100 pt-1 font-medium text-zinc-900">
        {gap >= 0 ? `Ahead ${money(gap)}` : `To break even ${money(-gap)}`}
      </div>
    </div>
  );
}

export function BreakEvenChart({ data, today }: { data: BreakEvenPoint[]; today: string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "#71717a" }}
          tickFormatter={(d) => dayFmt(d, { day: "numeric", month: "short" })}
          axisLine={false}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#71717a" }}
          tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip content={<TooltipBody />} cursor={{ stroke: "#a1a1aa", strokeDasharray: "3 3" }} />
        <ReferenceLine x={today} stroke="#d4d4d8" label={{ value: "Today", position: "insideTopRight", fontSize: 11, fill: "#71717a" }} />
        <Line type="monotone" dataKey="expenses" name="Expenses" stroke={EXPENSES} strokeWidth={2} dot={false} activeDot={{ r: 4 }} connectNulls={false} />
        <Line type="monotone" dataKey="sales" name="Sales" stroke={SALES} strokeWidth={2} dot={false} activeDot={{ r: 4 }} connectNulls={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function BreakEvenLegend({ sales, expenses }: { sales: number; expenses: number }) {
  const gap = sales - expenses;
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
      <span className="flex items-center gap-2 text-zinc-700">
        <span className="h-0.5 w-4 rounded" style={{ background: SALES }} /> Sales <b className="text-zinc-900">{money(sales)}</b>
      </span>
      <span className="flex items-center gap-2 text-zinc-700">
        <span className="h-0.5 w-4 rounded" style={{ background: EXPENSES }} /> Expenses{" "}
        <b className="text-zinc-900">{money(expenses)}</b>
      </span>
      <span className="text-zinc-500">
        {gap >= 0 ? (
          <>
            Ahead by <b className="text-zinc-900">{money(gap)}</b>
          </>
        ) : (
          <>
            To break even <b className="text-zinc-900">{money(-gap)}</b>
          </>
        )}
      </span>
    </div>
  );
}
