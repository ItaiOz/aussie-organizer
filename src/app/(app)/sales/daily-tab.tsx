"use client";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { money } from "@/lib/format";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { format } from "date-fns";

const ALL = "__all__";

const COLORS = ["#18181b", "#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#ec4899", "#0ea5e9", "#84cc16"];

type CenterCell = { cash: number; card: number; refund: number; net: number };
type DailyRow = { date: string; label: string; perCenter: Record<string, CenterCell> };
type Center = { id: string; name: string };

export function DailyTab({ rows, centers, days }: { rows: DailyRow[]; centers: Center[]; days: number }) {
  const [centerId, setCenterId] = useState<string>(ALL);

  const colorByCenter = useMemo(() => {
    const map: Record<string, string> = {};
    centers.forEach((c, i) => (map[c.id] = COLORS[i % COLORS.length]));
    return map;
  }, [centers]);

  // Build chart data (oldest to newest for x-axis)
  const chartData = useMemo(() => {
    const ordered = [...rows].reverse();
    if (centerId === ALL) {
      return ordered.map((r) => {
        const point: Record<string, string | number> = { date: r.date };
        for (const c of centers) point[c.id] = r.perCenter[c.id]?.net ?? 0;
        return point;
      });
    }
    return ordered.map((r) => ({ date: r.date, [centerId]: r.perCenter[centerId]?.net ?? 0 }));
  }, [rows, centers, centerId]);

  // Build table data (newest first)
  const tableRows = useMemo(() => {
    return rows.map((r) => {
      if (centerId === ALL) {
        const totals = Object.values(r.perCenter).reduce(
          (a, b) => ({
            cash: a.cash + b.cash,
            card: a.card + b.card,
            refund: a.refund + b.refund,
            net: a.net + b.net,
          }),
          { cash: 0, card: 0, refund: 0, net: 0 }
        );
        return { date: r.date, label: r.label, ...totals };
      }
      const c = r.perCenter[centerId] ?? { cash: 0, card: 0, refund: 0, net: 0 };
      return { date: r.date, label: r.label, ...c };
    });
  }, [rows, centerId]);

  const renderedCenters = centerId === ALL ? centers : centers.filter((c) => c.id === centerId);

  return (
    <>
      <Card className="mb-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Net sales — last {days} days</CardTitle>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-zinc-500">Center</Label>
            <Select value={centerId} onValueChange={setCenterId}>
              <SelectTrigger className="w-48 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All centers</SelectItem>
                {centers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                formatter={(v, name) => {
                  const center = centers.find((c) => c.id === name);
                  return [`$${Number(v ?? 0).toLocaleString()}`, center?.name ?? String(name)];
                }}
              />
              {centerId === ALL && centers.length > 1 && (
                <Legend
                  formatter={(value) => centers.find((c) => c.id === value)?.name ?? value}
                  wrapperStyle={{ fontSize: 11 }}
                />
              )}
              {renderedCenters.map((c, i) => (
                <Bar
                  key={c.id}
                  dataKey={c.id}
                  stackId={centerId === ALL ? "stack" : undefined}
                  fill={colorByCenter[c.id]}
                  radius={i === renderedCenters.length - 1 ? [3, 3, 0, 0] : 0}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Cash</TableHead>
                <TableHead className="text-right">Card</TableHead>
                <TableHead className="text-right">Refund</TableHead>
                <TableHead className="text-right">Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableRows.map((d) => (
                <TableRow key={d.date}>
                  <TableCell className="font-medium">{d.label}</TableCell>
                  <TableCell className="text-right">{d.cash === 0 ? <span className="text-zinc-300">—</span> : money(d.cash)}</TableCell>
                  <TableCell className="text-right">{d.card === 0 ? <span className="text-zinc-300">—</span> : money(d.card)}</TableCell>
                  <TableCell className="text-right text-red-600">{d.refund === 0 ? <span className="text-zinc-300">—</span> : `−${money(d.refund)}`}</TableCell>
                  <TableCell className={"text-right font-semibold " + (d.net < 0 ? "text-red-600" : d.net === 0 ? "text-zinc-300" : "")}>
                    {d.net === 0 ? "—" : money(d.net)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
