import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, PageBody } from "@/components/page-header";
import { money, businessTodayUTC, businessHour } from "@/lib/format";
import { seasonStart, seasonEnd, addDaysUTC, weekdayLabel, DAY_MS } from "@/lib/season";
import { SalesChart } from "./sales-chart";
import { Kpi } from "@/components/kpi";
import { SortableTable, type SortColumn, type SortRow } from "@/components/sortable-table";
import { centerMetrics, reportStatus, REPORT_DUE_HOUR } from "@/lib/metrics";
import { DailyReports } from "./daily-reports";
import { BreakEvenChart, BreakEvenLegend, type BreakEvenPoint } from "./break-even-chart";
import { DollarSign, CalendarDays, Trophy, Star, CalendarCheck, Award, Store } from "lucide-react";

export const dynamic = "force-dynamic";

const CENTRE_COLUMNS: SortColumn[] = [
  { key: "name", label: "Centre", kind: "text" },
  { key: "today", label: "Today", kind: "money" },
  { key: "yesterday", label: "Yesterday", kind: "money" },
  { key: "week", label: "This week", kind: "money" },
  { key: "last7", label: "Last 7 days", kind: "money", strong: true },
  {
    key: "trend7",
    label: "Trend",
    kind: "trend",
    tooltip: "Last 7 days compared with the 7 days before. Hover a value for the amounts.",
    cellTitle: "trendTitle",
  },
  { key: "avgPerDay", label: "Avg / day", kind: "money" },
  { key: "total", label: "Season total", kind: "money" },
  { key: "endsDate", label: "Booking ends", kind: "date", sub: "endsNote", subTone: "endsTone" },
];

// Fewer trading days than this and one big day would top the average.
const MIN_DAYS_FOR_AVG = 3;

export default async function DashboardPage() {
  // Calendar days in Brisbane time, matching how sale dates are stored.
  const bizToday = businessTodayUTC();
  // Days until Christmas in Brisbane; after the 25th, count to next year's
  let christmas = new Date(Date.UTC(bizToday.getUTCFullYear(), 11, 25));
  if (christmas < bizToday) christmas = new Date(Date.UTC(bizToday.getUTCFullYear() + 1, 11, 25));
  const daysToChristmas = Math.round((christmas.getTime() - bizToday.getTime()) / DAY_MS);
  const bizYesterday = addDaysUTC(bizToday, -1);
  const bizWeekStart = addDaysUTC(bizToday, -((bizToday.getUTCDay() + 6) % 7));
  const bizWeekEnd = addDaysUTC(bizWeekStart, 6);
  // Last week up to the same weekday as today
  const lastWeekStart = addDaysUTC(bizWeekStart, -7);
  const lastWeekSameDay = addDaysUTC(bizToday, -7);
  const seasonTo = seasonEnd() < bizToday ? seasonEnd() : bizToday;
  const last30 = addDaysUTC(bizToday, -29); // 30 days including today

  const [compareSales, allSales30, centers, seasonSales, weekSellerSales, salesToDate, expensesToDate, bookedCentres] = await Promise.all([
    prisma.dailySale.findMany({
      where: { date: { gte: lastWeekStart, lte: bizToday } },
      select: { date: true, cashAmount: true, cardAmount: true, refundAmount: true },
    }),
    prisma.dailySale.findMany({
      where: { date: { gte: last30, lte: bizToday } },
      select: { date: true, cashAmount: true, cardAmount: true, refundAmount: true, centerId: true },
      orderBy: { date: "asc" },
    }),
    prisma.shoppingCenter.findMany({ where: { status: "booked" } }),
    prisma.dailySale.findMany({
      where: { date: { gte: seasonStart(), lte: seasonTo } },
      select: { date: true, cashAmount: true, cardAmount: true, refundAmount: true, center: { select: { name: true } } },
    }),
    prisma.employeeSale.findMany({
      where: { dailySale: { date: { gte: bizWeekStart, lte: bizWeekEnd } } },
      select: { amount: true, employee: { select: { fullName: true } } },
    }),
    prisma.dailySale.findMany({
      where: { date: { lte: bizToday } },
      select: {
        date: true,
        centerId: true,
        cashAmount: true,
        cardAmount: true,
        refundAmount: true,
        center: { select: { name: true, bookedTo: true } },
      },
    }),
    prisma.expense.findMany({ where: { datePaid: { lte: bizToday } }, select: { datePaid: true, amount: true } }),
    prisma.shoppingCenter.findMany({
      where: { status: "booked" },
      select: { id: true, name: true, bookedFrom: true, bookedTo: true, sales: { select: { date: true } } },
    }),
  ]);

  // Daily reports: which booked centres haven't reported (today counts from 6pm Brisbane)
  const hourNow = businessHour();
  const reports = reportStatus(
    bookedCentres.map((c) => ({
      id: c.id,
      name: c.name,
      bookedFrom: c.bookedFrom,
      bookedTo: c.bookedTo,
      reported: new Set(c.sales.map((s) => s.date.toISOString().slice(0, 10))),
    })),
    bizToday,
    hourNow
  );

  // Break-even: running totals across the season. Expenses paid before the season
  // (mostly stock) are the starting point; days after today are left empty.
  const isoDay = (d: Date) => d.toISOString().slice(0, 10);
  const salesByDay = new Map<string, number>();
  for (const s of salesToDate) salesByDay.set(isoDay(s.date), (salesByDay.get(isoDay(s.date)) ?? 0) + s.cashAmount + s.cardAmount - s.refundAmount);
  const expensesByDay = new Map<string, number>();
  for (const e of expensesToDate) expensesByDay.set(isoDay(e.datePaid), (expensesByDay.get(isoDay(e.datePaid)) ?? 0) + e.amount);
  let cumSales = 0;
  let cumExpenses = 0;
  for (const [d, v] of salesByDay) if (d < isoDay(seasonStart())) cumSales += v;
  for (const [d, v] of expensesByDay) if (d < isoDay(seasonStart())) cumExpenses += v;
  const breakEven: BreakEvenPoint[] = [];
  for (let d = seasonStart(); d <= seasonEnd(); d = addDaysUTC(d, 1)) {
    const key = isoDay(d);
    if (d > bizToday) {
      breakEven.push({ date: key, sales: null, expenses: null });
      continue;
    }
    cumSales += salesByDay.get(key) ?? 0;
    cumExpenses += expensesByDay.get(key) ?? 0;
    breakEven.push({ date: key, sales: cumSales, expenses: cumExpenses });
  }

  // Centre status table: centres with sales this season only
  const sumNetOf = (rows: typeof salesToDate) => rows.reduce((t, s) => t + s.cashAmount + s.cardAmount - s.refundAmount, 0);
  const centreInfo = new Map(salesToDate.map((s) => [s.centerId, s.center]));
  const centreStats = centerMetrics(
    [...centreInfo.entries()].map(([id, c]) => ({ id, name: c.name })),
    salesToDate.map((s) => ({ ...s, expenseTotal: 0 })),
    seasonStart(),
    seasonEnd(),
    bizToday
  ).filter((m) => m.days > 0);
  const daysLeft = (end: Date | null) => (end ? Math.round((end.getTime() - bizToday.getTime()) / DAY_MS) : null);
  const daysLeftNote = (left: number | null) =>
    left === null ? null : left > 1 ? `${left} days left` : left === 1 ? "1 day left" : left === 0 ? "Last day" : "Ended";
  // Ended: grey · last 3 days: amber · otherwise blue
  const daysLeftTone = (left: number | null) => (left === null ? null : left < 0 ? "zinc" : left <= 3 ? "amber" : "sky");
  const last7From = addDaysUTC(bizToday, -6);
  const prev7From = addDaysUTC(bizToday, -13);
  const centreRows: SortRow[] = centreStats.map((m) => {
    const own = salesToDate.filter((s) => s.centerId === m.id);
    const end = centreInfo.get(m.id)?.bookedTo ?? null;
    const left = daysLeft(end);
    const prev7 = sumNetOf(own.filter((s) => s.date >= prev7From && s.date < last7From && s.date >= seasonStart()));
    // "—" means no report; a report with no sales shows $0.00
    const todayRows = own.filter((s) => s.date.getTime() === bizToday.getTime());
    const yesterdayRows = own.filter((s) => s.date.getTime() === bizYesterday.getTime());
    return {
      id: m.id,
      name: m.name,
      today: todayRows.length ? sumNetOf(todayRows) : null,
      yesterday: yesterdayRows.length ? sumNetOf(yesterdayRows) : null,
      week: sumNetOf(own.filter((s) => s.date >= bizWeekStart)),
      last7: m.last7,
      prev7,
      days: m.days,
      trend7: m.trend7,
      trendTitle:
        m.trend7 === null
          ? null
          : `Last 7 days ${money(m.last7)} vs previous 7 days ${money(prev7)}`,
      avgPerDay: m.avgPerDay,
      total: m.total,
      endsDate: end ? end.toISOString().slice(0, 10) : null,
      endsNote: daysLeftNote(left),
      endsTone: daysLeftTone(left),
    };
  });
  const sumCol = (k: string) => centreRows.reduce((t, r) => t + ((r[k] as number | null) ?? 0), 0);
  // Totals cover the centres shown
  const allLast7 = sumCol("last7");
  const allPrev7 = sumCol("prev7");
  const centreDays = sumCol("days");
  const centreFooter: SortRow = {
    id: "total",
    name: "Total",
    today: centreRows.some((r) => r.today !== null) ? sumCol("today") : null,
    yesterday: centreRows.some((r) => r.yesterday !== null) ? sumCol("yesterday") : null,
    week: sumCol("week"),
    last7: allLast7,
    trend7: allPrev7 ? (allLast7 - allPrev7) / allPrev7 : null,
    trendTitle: allPrev7 ? `Last 7 days ${money(allLast7)} vs previous 7 days ${money(allPrev7)}` : null,
    avgPerDay: centreDays ? sumCol("total") / centreDays : null,
    total: sumCol("total"),
    endsDate: null,
    endsNote: null,
    endsTone: null,
  };

  // Season records
  const netOf = (r: { cashAmount: number; cardAmount: number; refundAmount: number }) =>
    r.cashAmount + r.cardAmount - r.refundAmount;
  const byCenterSeason = new Map<string, number>();
  const daysByCenterSeason = new Map<string, number>();
  const byDateSeason = new Map<string, { date: Date; total: number; centers: number }>();
  let bestSingle: (typeof seasonSales)[number] | null = null;
  for (const s of seasonSales) {
    byCenterSeason.set(s.center.name, (byCenterSeason.get(s.center.name) ?? 0) + netOf(s));
    daysByCenterSeason.set(s.center.name, (daysByCenterSeason.get(s.center.name) ?? 0) + 1);
    const key = s.date.toISOString().slice(0, 10);
    const d = byDateSeason.get(key) ?? { date: s.date, total: 0, centers: 0 };
    d.total += netOf(s);
    d.centers++;
    byDateSeason.set(key, d);
    if (!bestSingle || netOf(s) > netOf(bestSingle)) bestSingle = s;
  }
  const bestCenter = [...byCenterSeason.entries()].sort((a, b) => b[1] - a[1])[0];
  const bestAvgCenter = [...byCenterSeason.entries()]
    .map(([name, total]) => ({ name, days: daysByCenterSeason.get(name) ?? 0, avg: total / (daysByCenterSeason.get(name) || 1) }))
    .filter((c) => c.days >= MIN_DAYS_FOR_AVG)
    .sort((a, b) => b.avg - a.avg)[0];
  const bestCombined = [...byDateSeason.values()].sort((a, b) => b.total - a.total)[0];
  const bySeller = new Map<string, number>();
  for (const s of weekSellerSales) bySeller.set(s.employee.fullName, (bySeller.get(s.employee.fullName) ?? 0) + s.amount);
  const topSeller = [...bySeller.entries()].sort((a, b) => b[1] - a[1])[0];

  const sumNet = (rows: { cashAmount: number; cardAmount: number; refundAmount: number }[]) =>
    rows.reduce(
      (acc, r) => ({
        cash: acc.cash + r.cashAmount,
        card: acc.card + r.cardAmount,
        refund: acc.refund + r.refundAmount,
      }),
      { cash: 0, card: 0, refund: 0 }
    );

  const between = (from: Date, to: Date) => sumNet(compareSales.filter((s) => s.date >= from && s.date <= to));
  const total = (n: { cash: number; card: number; refund: number }) => n.cash + n.card - n.refund;
  const change = (cur: number, prev: number) => (prev ? (cur - prev) / prev : null);

  const todayTotal = total(between(bizToday, bizToday));
  const yesterdayTotal = total(between(bizYesterday, bizYesterday));
  const weekNet = between(bizWeekStart, bizToday);
  const weekTotal = total(weekNet);
  const lastWeekTotal = total(between(lastWeekStart, lastWeekSameDay));
  const weekCash = weekNet.cash;
  const weekCredit = weekNet.card;
  const sameDayName = lastWeekSameDay.toLocaleDateString("en-AU", { weekday: "short", timeZone: "UTC" });

  const salesByCenterMap = new Map<string, number>();
  for (const s of allSales30) {
    if (s.date < bizWeekStart || s.date > bizWeekEnd) continue;
    const cur = salesByCenterMap.get(s.centerId) ?? 0;
    salesByCenterMap.set(s.centerId, cur + s.cashAmount + s.cardAmount - s.refundAmount);
  }
  const salesByCenter = Array.from(salesByCenterMap.entries()).map(([centerId, total]) => ({ centerId, total }));
  const centerNameById = Object.fromEntries(centers.map((c) => [c.id, c.name]));

  const dailyTotals = new Map<string, number>();
  for (const s of allSales30) {
    const key = s.date.toISOString().slice(0, 10);
    dailyTotals.set(key, (dailyTotals.get(key) ?? 0) + s.cashAmount + s.cardAmount - s.refundAmount);
  }
  const chartData = Array.from(dailyTotals.entries())
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <>
      <PageHeader title="Dashboard" description="Today, this week, last 30 days" />
      <PageBody>
        <div className="mb-6 text-center text-2xl font-bold text-red-700 sm:text-3xl">
          🎄{" "}
          {daysToChristmas === 0
            ? "Merry Christmas!"
            : `${daysToChristmas} day${daysToChristmas === 1 ? "" : "s"} until Christmas`}
        </div>

        <DailyReports status={reports} afterDue={hourNow >= REPORT_DUE_HOUR} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Kpi
            label="Sales today"
            value={money(todayTotal)}
            // Reports arrive at end of shift; don't show "↓100%" before any are in
            change={todayTotal ? { value: change(todayTotal, yesterdayTotal), vs: "yesterday" } : undefined}
            sub={todayTotal ? `Yesterday ${money(yesterdayTotal)}` : `No reports yet today · yesterday ${money(yesterdayTotal)}`}
            tone="sky"
            icon={DollarSign}
          />
          <Kpi
            label="Sales this week"
            tone="sky"
            icon={CalendarDays}
            value={money(weekTotal)}
            change={{ value: change(weekTotal, lastWeekTotal), vs: `last week (Mon–${sameDayName})` }}
            sub={`Last week Mon–${sameDayName} ${money(lastWeekTotal)} · ${money(weekCash)} cash · ${money(weekCredit)} credit`}
          />
          <Kpi
            label="Top salesperson this week"
            tone="rose"
            icon={Award}
            compact
            value={topSeller ? `${topSeller[0]} · ${money(topSeller[1])}` : "—"}
            sub={topSeller ? "Monday to today" : "No sales this week yet"}
          />
        </div>

        <h2 className="text-sm font-semibold text-zinc-700 mb-3">This season</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Kpi
            label="Best center so far"
            tone="emerald"
            icon={Trophy}
            compact
            value={bestCenter ? `${bestCenter[0]} · ${money(bestCenter[1])}` : "—"}
            sub={bestCenter ? "Season total so far" : "No sales yet"}
          />
          <Kpi
            label="Best center by average / day"
            tone="sky"
            icon={Store}
            compact
            value={bestAvgCenter ? `${bestAvgCenter.name} · ${money(bestAvgCenter.avg)}` : "—"}
            sub={bestAvgCenter ? `Over ${bestAvgCenter.days} trading days` : `Needs ${MIN_DAYS_FOR_AVG}+ trading days`}
          />
          <Kpi
            label="Best day (single center)"
            tone="amber"
            icon={Star}
            compact
            value={bestSingle ? `${bestSingle.center.name} · ${money(netOf(bestSingle))}` : "—"}
            sub={bestSingle ? weekdayLabel(bestSingle.date) : "No sales yet"}
          />
          <Kpi
            label="Best day (all centers)"
            tone="violet"
            icon={CalendarCheck}
            value={bestCombined ? money(bestCombined.total) : "—"}
            sub={
              bestCombined
                ? `${weekdayLabel(bestCombined.date)} · ${bestCombined.centers} center${bestCombined.centers === 1 ? "" : "s"}`
                : "No sales yet"
            }
          />
        </div>

        <Card className="relative mb-6 overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-emerald-500" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="rounded-md bg-emerald-50 p-1.5 text-emerald-600">
                <Store className="h-4 w-4" />
              </span>
              Centres right now
            </CardTitle>
            <p className="text-xs text-zinc-500">
              Centres with sales this season. Avg / day is the season total ÷ days traded. Click a column header to
              sort.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <SortableTable
              columns={CENTRE_COLUMNS}
              rows={centreRows}
              footer={centreFooter}
              defaultSort={{ key: "last7", dir: "desc" }}
              empty="No centre has sales this season yet."
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Sales — last 30 days</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <SalesChart data={chartData} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>This week by center</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {salesByCenter.length === 0 && <li className="text-sm text-zinc-500">No sales recorded this week.</li>}
                {salesByCenter
                  .sort((a, b) => b.total - a.total)
                  .map((row) => (
                    <li key={row.centerId} className="flex items-center justify-between text-sm">
                      <span className="text-zinc-700">{centerNameById[row.centerId] ?? "—"}</span>
                      <span className={"font-medium " + (row.total < 0 ? "text-red-600" : "")}>{money(row.total)}</span>
                    </li>
                  ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader className="space-y-2">
            <CardTitle>Break-even: sales vs expenses (running totals)</CardTitle>
            <BreakEvenLegend sales={cumSales} expenses={cumExpenses} />
          </CardHeader>
          <CardContent className="h-72">
            <BreakEvenChart data={breakEven} today={isoDay(bizToday)} />
          </CardContent>
        </Card>
      </PageBody>
    </>
  );
}
