"use client";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Tip } from "@/components/tip";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";

export type GridEntry = {
  date: string; // yyyy-MM-dd
  centerId: string;
  cash: number;
  card: number;
  refund: number;
  notes: string | null;
  sellers: { name: string; amount: number }[];
  expenses: { title: string; amount: number }[];
};

type Centre = { id: string; name: string };
type Range = "last7" | "week" | "season" | "custom";

const DAY = 24 * 60 * 60 * 1000;
const addDays = (iso: string, n: number) => new Date(new Date(iso).getTime() + n * DAY).toISOString().slice(0, 10);
const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const netOf = (e: GridEntry) => e.cash + e.card - e.refund;

const RANGES: { key: Range; label: string }[] = [
  { key: "last7", label: "Last 7 days" },
  { key: "week", label: "This week" },
  { key: "season", label: "Season" },
  { key: "custom", label: "Custom" },
];

function EntryDetails({ centre, date, e }: { centre: string; date: string; e: GridEntry }) {
  return (
    <div className="space-y-1.5">
      <div className="font-semibold">
        {centre} · {fmtDay(date)}
      </div>
      <div className="grid grid-cols-[auto_auto] gap-x-3 tabular-nums">
        <span className="text-zinc-400">Cash</span>
        <span className="text-right">{money(e.cash)}</span>
        <span className="text-zinc-400">Credit</span>
        <span className="text-right">{money(e.card)}</span>
        {e.refund > 0 && (
          <>
            <span className="text-zinc-400">Refunds</span>
            <span className="text-right">−{money(e.refund)}</span>
          </>
        )}
        <span className="font-semibold">Net</span>
        <span className="text-right font-semibold">{money(netOf(e))}</span>
      </div>
      {e.sellers.length > 0 && (
        <div>
          <div className="text-zinc-400">Salespeople</div>
          {e.sellers.map((s) => (
            <div key={s.name}>
              {s.name} · {money(s.amount)}
            </div>
          ))}
        </div>
      )}
      {e.expenses.length > 0 && (
        <div>
          <div className="text-zinc-400">Expenses</div>
          {e.expenses.map((x, i) => (
            <div key={i}>
              {x.title} · {money(x.amount)}
            </div>
          ))}
        </div>
      )}
      {e.notes && (
        <div>
          <div className="text-zinc-400">Notes</div>
          <div>{e.notes}</div>
        </div>
      )}
    </div>
  );
}

// Every day of every centre: dates down, centres across, with totals both ways.
export function SalesGrid({
  centres,
  entries,
  today,
  weekStart,
  seasonStart,
}: {
  centres: Centre[];
  entries: GridEntry[];
  today: string;
  weekStart: string;
  seasonStart: string;
}) {
  const [range, setRange] = useState<Range>("season");
  const [customFrom, setCustomFrom] = useState(seasonStart);
  const [customTo, setCustomTo] = useState(today);

  const [from, to] =
    range === "last7"
      ? [addDays(today, -6), today]
      : range === "week"
        ? [weekStart, today]
        : range === "season"
          ? [seasonStart, today]
          : [customFrom <= customTo ? customFrom : customTo, customFrom <= customTo ? customTo : customFrom];

  const { dates, cols, byKey, rowTotals, colTotals, grand } = useMemo(() => {
    const inRange = entries.filter((e) => e.date >= from && e.date <= to);
    const byKey = new Map(inRange.map((e) => [`${e.date}|${e.centerId}`, e]));
    // Only centres with at least one entry in the range get a column
    const cols = centres.filter((c) => inRange.some((e) => e.centerId === c.id));
    const dates: string[] = [];
    for (let d = to; d >= from; d = addDays(d, -1)) dates.push(d);
    const rowTotals = new Map<string, number>();
    const colTotals = new Map<string, number>();
    for (const e of inRange) {
      rowTotals.set(e.date, (rowTotals.get(e.date) ?? 0) + netOf(e));
      colTotals.set(e.centerId, (colTotals.get(e.centerId) ?? 0) + netOf(e));
    }
    const grand = inRange.reduce((t, e) => t + netOf(e), 0);
    return { dates, cols, byKey, rowTotals, colTotals, grand };
  }, [entries, centres, from, to]);

  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle>Sales by day</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-md border border-zinc-200 p-0.5" role="group" aria-label="Date range">
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setRange(r.key)}
                aria-pressed={range === r.key}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-medium",
                  range === r.key ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          {range === "custom" && (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Input
                id="grid-from"
                type="date"
                value={customFrom}
                max={today}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-8 w-36"
                aria-label="From"
              />
              to
              <Input
                id="grid-to"
                type="date"
                value={customTo}
                max={today}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-8 w-36"
                aria-label="To"
              />
            </div>
          )}
        </div>
        <p className="text-xs text-zinc-500">Net sales. Hover or tap a day to see its details. — means no report.</p>
      </CardHeader>
      <CardContent className="p-0">
        {cols.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-zinc-500">No sales in this range.</p>
        ) : (
          // Tighter cells on phones so more centres fit; normal spacing from the sm breakpoint up
          <Table className="[&_td]:px-3 [&_td]:py-2 [&_th]:px-3 sm:[&_td]:p-4 sm:[&_th]:px-4">
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-10 bg-white">Date</TableHead>
                {cols.map((c) => (
                  <TableHead key={c.id} className="text-right whitespace-nowrap">
                    {c.name}
                  </TableHead>
                ))}
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dates.map((d, i) => (
                <TableRow key={d}>
                  <TableCell className="sticky left-0 z-10 bg-white whitespace-nowrap font-medium">{fmtDay(d)}</TableCell>
                  {cols.map((c, j) => {
                    const e = byKey.get(`${d}|${c.id}`);
                    return (
                      <TableCell key={c.id} className="text-right tabular-nums whitespace-nowrap">
                        {e ? (
                          <Tip
                            // First rows open downwards so the bubble isn't cut off by the table's top edge
                            below={i < 3}
                            align={j === 0 ? "left" : "right"}
                            content={<EntryDetails centre={c.name} date={d} e={e} />}
                            className="underline decoration-zinc-300 decoration-dotted underline-offset-4"
                          >
                            {money(netOf(e))}
                          </Tip>
                        ) : (
                          <span className="text-zinc-300">—</span>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-right font-semibold tabular-nums whitespace-nowrap">
                    {rowTotals.get(d) ? money(rowTotals.get(d)!) : <span className="font-normal text-zinc-300">—</span>}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2 border-zinc-300 bg-zinc-50 hover:bg-zinc-50">
                <TableCell className="sticky left-0 z-10 bg-zinc-50 font-semibold">Total</TableCell>
                {cols.map((c) => (
                  <TableCell key={c.id} className="text-right font-semibold tabular-nums whitespace-nowrap">
                    {money(colTotals.get(c.id) ?? 0)}
                  </TableCell>
                ))}
                <TableCell className="text-right font-bold tabular-nums whitespace-nowrap">{money(grand)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
