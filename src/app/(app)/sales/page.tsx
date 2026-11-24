import { prisma } from "@/lib/prisma";
import { PageHeader, PageBody } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { money, fmtDate, businessTodayUTC } from "@/lib/format";
import { seasonStart, seasonEnd, addDaysUTC, dayLabel } from "@/lib/season";
import { centerMetrics } from "@/lib/metrics";
import { Kpi } from "@/components/kpi";
import { DollarSign, CalendarDays, Store, CreditCard } from "lucide-react";
import { subDays, startOfDay, format } from "date-fns";
import { SaleFormDialog } from "./sale-form-dialog";
import { DailyTab } from "./daily-tab";
import { SalesGrid } from "./sales-grid";

export const dynamic = "force-dynamic";

const DAYS_BACK = 30;
// Fewer trading days than this and one big day would top the average.
const MIN_DAYS_FOR_AVG = 3;

export default async function SalesPage() {
  const now = new Date();
  // Sale dates are stored at UTC midnight, so weeks are built on UTC calendar days.
  const weeks: { start: Date; end: Date; key: string; label: string }[] = [];
  const lastEnd = seasonEnd();
  for (let start = seasonStart(); start <= lastEnd; start = addDaysUTC(start, 7)) {
    const end = addDaysUTC(start, 6);
    weeks.push({ start, end, key: start.toISOString().slice(0, 10), label: `${dayLabel(start)} – ${dayLabel(end)}` });
  }

  const oldestWeekStart = weeks[0].start;
  const oldestDay = startOfDay(subDays(now, DAYS_BACK - 1));
  const oldestStart = oldestDay < oldestWeekStart ? oldestDay : oldestWeekStart;

  const gridFrom = new Date(Date.UTC(businessTodayUTC().getUTCFullYear(), 0, 1));
  const [recent, employees, centers, weeklySales, gridSales] = await Promise.all([
    prisma.dailySale.findMany({
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: { center: true, employeeSales: { include: { employee: true } }, saleExpenses: true },
      take: 50,
    }),
    prisma.employee.findMany({
      where: { status: "active" },
      orderBy: { fullName: "asc" },
    }),
    prisma.shoppingCenter.findMany({
      where: { status: "booked" },
      orderBy: { name: "asc" },
    }),
    prisma.dailySale.findMany({
      where: { date: { gte: oldestStart } },
      select: {
        date: true,
        centerId: true,
        cashAmount: true,
        cardAmount: true,
        refundAmount: true,
        saleExpenses: { select: { amount: true } },
      },
    }),
    // Year to date with full details, for the "Sales by day" grid and its hover details
    prisma.dailySale.findMany({
      where: { date: { gte: gridFrom, lte: businessTodayUTC() } },
      select: {
        date: true,
        centerId: true,
        cashAmount: true,
        cardAmount: true,
        refundAmount: true,
        notes: true,
        center: { select: { name: true } },
        employeeSales: { select: { amount: true, employee: { select: { fullName: true } } } },
        saleExpenses: { select: { title: true, amount: true } },
      },
    }),
  ]);

  const performance = centerMetrics(
    centers.map((c) => ({ id: c.id, name: c.name })),
    weeklySales.map((s) => ({ ...s, expenseTotal: s.saleExpenses.reduce((t, x) => t + x.amount, 0) })),
    seasonStart(),
    seasonEnd(),
    businessTodayUTC()
  );

  // Summary cards
  const today = businessTodayUTC();
  const netOf = (r: { cashAmount: number; cardAmount: number; refundAmount: number }) =>
    r.cashAmount + r.cardAmount - r.refundAmount;
  const seasonTotal = performance.reduce((t, c) => t + c.total, 0);
  // Cash vs credit this season (before refunds), same range as "Season to date"
  const seasonRows = weeklySales.filter((s) => s.date >= seasonStart() && s.date <= seasonEnd() && s.date <= today);
  const seasonCash = seasonRows.reduce((t, s) => t + s.cashAmount, 0);
  const seasonCard = seasonRows.reduce((t, s) => t + s.cardAmount, 0);
  const paidTotal = seasonCash + seasonCard;
  const pctOf = (n: number) => (paidTotal ? `${Math.round((n / paidTotal) * 100)}%` : "—");
  const seasonEntries = performance.reduce((t, c) => t + c.days, 0);
  const tradingCenters = performance.filter((c) => c.days > 0).length;
  // This week (Monday → today) vs the same weekdays last week
  const thisMon = addDaysUTC(today, -((today.getUTCDay() + 6) % 7));
  const lastMon = addDaysUTC(thisMon, -7);
  const lastSameDay = addDaysUTC(today, -7);
  const weekSoFar = weeklySales.filter((s) => s.date >= thisMon && s.date <= today).reduce((t, s) => t + netOf(s), 0);
  const lastWeekSoFar = weeklySales
    .filter((s) => s.date >= lastMon && s.date <= lastSameDay)
    .reduce((t, s) => t + netOf(s), 0);
  const weekChange = lastWeekSoFar ? (weekSoFar - lastWeekSoFar) / lastWeekSoFar : null;
  const bestAvgCenter = performance
    .filter((c) => c.days >= MIN_DAYS_FOR_AVG && c.avgPerDay !== null)
    .sort((a, b) => (b.avgPerDay ?? 0) - (a.avgPerDay ?? 0))[0];

  type Cell = { cash: number; card: number; refund: number; net: number };
  const blankRow = () => Object.fromEntries(weeks.map((w) => [w.key, { cash: 0, card: 0, refund: 0, net: 0 }])) as Record<string, Cell>;

  const byCenter: Record<string, Record<string, Cell>> = {};
  for (const c of centers) byCenter[c.id] = blankRow();

  for (const s of weeklySales) {
    const w = weeks.find((w) => s.date >= w.start && s.date <= w.end);
    if (!w) continue;
    const c = byCenter[s.centerId]?.[w.key];
    if (c) {
      c.cash += s.cashAmount;
      c.card += s.cardAmount;
      c.refund += s.refundAmount;
      c.net = c.cash + c.card - c.refund;
    }
  }

  // Column totals across all centers
  const weekTotals = blankRow();
  for (const row of Object.values(byCenter)) {
    for (const w of weeks) {
      const t = weekTotals[w.key];
      t.cash += row[w.key].cash;
      t.card += row[w.key].card;
      t.refund += row[w.key].refund;
      t.net = t.cash + t.card - t.refund;
    }
  }
  const grandTotal = Object.values(weekTotals).reduce((s, x) => s + x.net, 0);

  // Change vs the week before, per centre (or all centres when centerId is null). The week in
  // progress is compared with the same days of the previous week, so it isn't cut short.
  const todayBiz = businessTodayUTC();
  const netBetween = (from: Date, to: Date, centerId: string | null) =>
    weeklySales
      .filter((s) => s.date >= from && s.date <= to && (centerId === null || s.centerId === centerId))
      .reduce((t, s) => t + s.cashAmount + s.cardAmount - s.refundAmount, 0);
  const changeVsPrevWeek = (i: number, centerId: string | null) => {
    const w = weeks[i];
    if (i === 0 || w.start > todayBiz) return null;
    const curEnd = w.end < todayBiz ? w.end : todayBiz;
    const span = Math.round((curEnd.getTime() - w.start.getTime()) / (24 * 60 * 60 * 1000));
    const prevStart = weeks[i - 1].start;
    const cur = netBetween(w.start, curEnd, centerId);
    const prev = netBetween(prevStart, addDaysUTC(prevStart, span), centerId);
    if (cur === 0 && prev === 0) return null;
    return { diff: cur - prev, pct: prev ? (cur - prev) / prev : null, partial: curEnd < w.end, prevLabel: weeks[i - 1].label };
  };
  const changeLine = (c: ReturnType<typeof changeVsPrevWeek>) =>
    c && (
      <div
        className={"text-xs font-medium " + (c.diff >= 0 ? "text-green-700" : "text-red-600")}
        title={c.partial ? "vs the same days of the week before" : `vs ${c.prevLabel}`}
      >
        {c.diff >= 0 ? "+" : "−"}
        {money(Math.abs(c.diff))}
        {c.pct !== null ? ` (${c.diff >= 0 ? "+" : "−"}${Math.abs(c.pct * 100).toFixed(0)}%)` : " (new)"}
      </div>
    );

  // Daily aggregation, keyed by date with per-center breakdown
  type CenterCell = { cash: number; card: number; refund: number; net: number };
  type DailyCell = { date: string; label: string; perCenter: Record<string, CenterCell> };
  const dailyMap = new Map<string, DailyCell>();
  for (let i = DAYS_BACK - 1; i >= 0; i--) {
    const d = startOfDay(subDays(now, i));
    const key = format(d, "yyyy-MM-dd");
    const perCenter: Record<string, CenterCell> = {};
    for (const c of centers) perCenter[c.id] = { cash: 0, card: 0, refund: 0, net: 0 };
    dailyMap.set(key, { date: key, label: format(d, "EEE, d MMM"), perCenter });
  }
  for (const s of weeklySales) {
    if (s.date < oldestDay) continue;
    const key = s.date.toISOString().slice(0, 10);
    const cell = dailyMap.get(key);
    if (!cell) continue;
    const cc = cell.perCenter[s.centerId];
    if (!cc) continue;
    cc.cash += s.cashAmount;
    cc.card += s.cardAmount;
    cc.refund += s.refundAmount;
    cc.net = cc.cash + cc.card - cc.refund;
  }
  const dailyRows = Array.from(dailyMap.values()).reverse();

  return (
    <>
      <PageHeader
        title="Sales"
        description="Weekly by center and daily breakdown"
        action={
          <SaleFormDialog
            centers={centers.map((c) => ({ id: c.id, name: c.name }))}
            employees={employees.map((e) => ({
              id: e.id,
              fullName: e.fullName,
            }))}
          />
        }
      />
      <PageBody>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Kpi
            label="Season to date"
            value={money(seasonTotal)}
            sub={`${seasonEntries} report${seasonEntries === 1 ? "" : "s"} · ${tradingCenters} center${tradingCenters === 1 ? "" : "s"} trading`}
            tone="emerald"
            icon={DollarSign}
          />
          <Kpi
            label="This week so far"
            value={money(weekSoFar)}
            change={{ value: weekChange, vs: "same days last week" }}
            sub={`Last week same days ${money(lastWeekSoFar)}`}
            tone="sky"
            icon={CalendarDays}
          />
          <Kpi
            label="Best average / day"
            compact
            value={bestAvgCenter ? `${bestAvgCenter.name} · ${money(bestAvgCenter.avgPerDay ?? 0)}` : "—"}
            sub={bestAvgCenter ? `Over ${bestAvgCenter.days} trading days` : `Needs ${MIN_DAYS_FOR_AVG}+ trading days`}
            tone="amber"
            icon={Store}
          />
          <Kpi
            label="Cash vs credit (season)"
            compact
            value={
              paidTotal
                ? `Credit · ${money(seasonCard)} (${pctOf(seasonCard)})\nCash · ${money(seasonCash)} (${pctOf(seasonCash)})`
                : "—"
            }
            sub={paidTotal ? "Season to date, before refunds" : "No sales yet"}
            tone="violet"
            icon={CreditCard}
          />
        </div>

        <div className="mb-6">
          <DailyTab
            rows={dailyRows}
            centers={centers.map((c) => ({ id: c.id, name: c.name }))}
            days={DAYS_BACK}
            middle={
              <div key="sales-by-day" className="mb-4">
                <SalesGrid
                  // Columns come from the sales themselves, so centres no longer booked keep their history
                  centres={[...new Map(gridSales.map((s) => [s.centerId, s.center.name])).entries()]
                    .map(([id, name]) => ({ id, name }))
                    .sort((a, b) => a.name.localeCompare(b.name))}
                  entries={gridSales.map((s) => ({
                    date: s.date.toISOString().slice(0, 10),
                    centerId: s.centerId,
                    cash: s.cashAmount,
                    card: s.cardAmount,
                    refund: s.refundAmount,
                    notes: s.notes,
                    sellers: s.employeeSales
                      .map((es) => ({ name: es.employee.fullName, amount: es.amount }))
                      .sort((a, b) => b.amount - a.amount),
                    expenses: s.saleExpenses.map((x) => ({ title: x.title, amount: x.amount })),
                  }))}
                  today={today.toISOString().slice(0, 10)}
                  weekStart={addDaysUTC(today, -((today.getUTCDay() + 6) % 7)).toISOString().slice(0, 10)}
                  seasonStart={seasonStart().toISOString().slice(0, 10)}
                />
              </div>
            }
          />
        </div>

        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle>
                Sales by center, by week ({dayLabel(weeks[0].start)} – {dayLabel(weeks[weeks.length - 1].end)})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-white">Center</TableHead>
                    {weeks.map((w) => (
                      <TableHead key={w.key} className="text-right whitespace-nowrap">{w.label}</TableHead>
                    ))}
                    <TableHead className="text-right whitespace-nowrap">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {centers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={weeks.length + 2} className="text-center text-zinc-500 py-12">
                        No booked centers yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {centers.map((c) => {
                    const row = byCenter[c.id];
                    const rowTotal = Object.values(row).reduce((s, x) => s + x.net, 0);
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="sticky left-0 bg-white font-medium whitespace-nowrap">{c.name}</TableCell>
                        {weeks.map((w, i) => {
                          const cell = row[w.key];
                          const change = changeVsPrevWeek(i, c.id);
                          return (
                            <TableCell key={w.key} className="text-right whitespace-nowrap">
                              {cell.net === 0 ? (
                                <>
                                  <span className="text-zinc-300">—</span>
                                  {changeLine(change)}
                                </>
                              ) : (
                                <div>
                                  <div className={"font-medium " + (cell.net < 0 ? "text-red-600" : "")}>{money(cell.net)}</div>
                                  <div className="text-xs text-zinc-400">
                                    C {money(cell.cash)} · Cr {money(cell.card)}
                                    {cell.refund > 0 && <> · −{money(cell.refund)}</>}
                                  </div>
                                  {changeLine(change)}
                                </div>
                              )}
                            </TableCell>
                          );
                        })}
                        <TableCell className={"text-right font-semibold whitespace-nowrap " + (rowTotal < 0 ? "text-red-600" : "")}>
                          {money(rowTotal)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {centers.length > 0 && (
                    <TableRow className="border-t-2 border-zinc-300 bg-zinc-50">
                      <TableCell className="sticky left-0 bg-zinc-50 font-semibold">Total</TableCell>
                      {weeks.map((w, i) => {
                        const cell = weekTotals[w.key];
                        return (
                          <TableCell key={w.key} className="text-right whitespace-nowrap">
                            {cell.net === 0 && cell.cash === 0 && cell.card === 0 ? (
                              <span className="text-zinc-300">—</span>
                            ) : (
                              <div>
                                <div className={"font-semibold " + (cell.net < 0 ? "text-red-600" : "")}>{money(cell.net)}</div>
                                <div className="text-xs text-zinc-400">
                                  C {money(cell.cash)} · Cr {money(cell.card)}
                                  {cell.refund > 0 && <> · −{money(cell.refund)}</>}
                                </div>
                                {changeLine(changeVsPrevWeek(i, null))}
                              </div>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className={"text-right font-bold whitespace-nowrap " + (grandTotal < 0 ? "text-red-600" : "")}>
                        {money(grandTotal)}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent entries</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Center</TableHead>
                  <TableHead className="text-right">Cash</TableHead>
                  <TableHead className="text-right">Card</TableHead>
                  <TableHead className="text-right">Refund</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead>Salespeople</TableHead>
                  <TableHead>Expenses</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-zinc-500 py-12">
                      No entries yet.
                    </TableCell>
                  </TableRow>
                )}
                {recent.map((s) => {
                  const net = s.cashAmount + s.cardAmount - s.refundAmount;
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="text-zinc-600 whitespace-nowrap">{fmtDate(s.date, "d MMM")}</TableCell>
                      <TableCell className="font-medium whitespace-nowrap">{s.center.name}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">{money(s.cashAmount)}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">{money(s.cardAmount)}</TableCell>
                      <TableCell className="text-right text-red-600">{s.refundAmount > 0 ? `−${money(s.refundAmount)}` : <span className="text-zinc-300">—</span>}</TableCell>
                      <TableCell className={"text-right font-semibold whitespace-nowrap " + (net < 0 ? "text-red-600" : "")}>{money(net)}</TableCell>
                      <TableCell className="text-zinc-500 text-sm">
                        {s.employeeSales.length === 0
                          ? "—"
                          : s.employeeSales
                              .map((es) => `${es.employee.fullName} (${money(es.amount)})`)
                              .join(", ")}
                      </TableCell>
                      <TableCell className="text-zinc-500 text-sm">
                        {s.saleExpenses.length === 0
                          ? "—"
                          : s.saleExpenses.map((ex) => `${ex.title} (${money(ex.amount)})`).join(", ")}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </PageBody>
    </>
  );
}
