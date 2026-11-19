import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, PageBody } from "@/components/page-header";
import { money, businessTodayUTC } from "@/lib/format";
import { seasonStart, seasonEnd, addDaysUTC, weekdayLabel } from "@/lib/season";
import { SalesChart } from "./sales-chart";
import { Kpi } from "@/components/kpi";
import { DollarSign, CalendarDays, Users, Trophy, Star, CalendarCheck, Award, Store } from "lucide-react";

export const dynamic = "force-dynamic";

// Fewer trading days than this and one big day would top the average.
const MIN_DAYS_FOR_AVG = 3;

export default async function DashboardPage() {
  // Calendar days in Brisbane time, matching how sale dates are stored.
  const bizToday = businessTodayUTC();
  const bizYesterday = addDaysUTC(bizToday, -1);
  const bizWeekStart = addDaysUTC(bizToday, -((bizToday.getUTCDay() + 6) % 7));
  const bizWeekEnd = addDaysUTC(bizWeekStart, 6);
  // Last week up to the same weekday as today
  const lastWeekStart = addDaysUTC(bizWeekStart, -7);
  const lastWeekSameDay = addDaysUTC(bizToday, -7);
  const seasonTo = seasonEnd() < bizToday ? seasonEnd() : bizToday;
  const last30 = addDaysUTC(bizToday, -29); // 30 days including today

  const [compareSales, allSales30, centers, activeEmployees, lowStock, seasonSales, weekSellerSales] = await Promise.all([
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
    prisma.employee.count({ where: { status: "active" } }),
    prisma.stockLevel.findMany({
      where: { quantity: { lte: prisma.stockLevel.fields.reorderThreshold } },
      include: { product: true },
    }),
    prisma.dailySale.findMany({
      where: { date: { gte: seasonStart(), lte: seasonTo } },
      select: { date: true, cashAmount: true, cardAmount: true, refundAmount: true, center: { select: { name: true } } },
    }),
    prisma.employeeSale.findMany({
      where: { dailySale: { date: { gte: bizWeekStart, lte: bizWeekEnd } } },
      select: { amount: true, employee: { select: { fullName: true } } },
    }),
  ]);

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
          <Kpi label="Active employees" value={String(activeEmployees)} icon={Users} />
        </div>

        <h2 className="text-sm font-semibold text-zinc-700 mb-3">This season</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
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
          <Kpi
            label="Top salesperson this week"
            tone="rose"
            icon={Award}
            compact
            value={topSeller ? `${topSeller[0]} · ${money(topSeller[1])}` : "—"}
            sub={topSeller ? "Monday to today" : "No sales this week yet"}
          />
        </div>

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

        <Card>
          <CardHeader>
            <CardTitle>Low stock alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <p className="text-sm text-zinc-500">All stock levels above their reorder threshold.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {lowStock.slice(0, 10).map((sl) => (
                  <li key={sl.id} className="flex items-center justify-between">
                    <span className="font-medium">{sl.product.name}</span>
                    <span className="text-red-600">
                      {sl.quantity} left (reorder at {sl.reorderThreshold})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </PageBody>
    </>
  );
}
