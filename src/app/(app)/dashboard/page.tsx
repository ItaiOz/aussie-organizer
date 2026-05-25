import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, PageBody } from "@/components/page-header";
import { money } from "@/lib/format";
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek } from "date-fns";
import { SalesChart } from "./sales-chart";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const last30 = subDays(now, 30);

  const [todaySales, weekSales, allSales30, centers, activeEmployees, openOrders, lowStock] = await Promise.all([
    prisma.dailySale.findMany({
      where: { date: { gte: todayStart, lte: todayEnd } },
      select: { type: true, cashAmount: true, creditAmount: true },
    }),
    prisma.dailySale.findMany({
      where: { date: { gte: weekStart, lte: weekEnd } },
      select: { type: true, cashAmount: true, creditAmount: true },
    }),
    prisma.dailySale.findMany({
      where: { date: { gte: last30 } },
      select: { date: true, type: true, cashAmount: true, creditAmount: true, centerId: true },
      orderBy: { date: "asc" },
    }),
    prisma.shoppingCenter.findMany({ where: { status: "booked" } }),
    prisma.employee.count({ where: { status: "active" } }),
    prisma.purchaseOrder.count({ where: { status: { in: ["draft", "sent"] } } }),
    prisma.stockLevel.findMany({
      where: { quantity: { lte: prisma.stockLevel.fields.reorderThreshold } },
      include: { product: true },
    }),
  ]);

  const sumNet = (rows: { type: string; cashAmount: number; creditAmount: number }[]) =>
    rows.reduce((acc, r) => {
      const sign = r.type === "refund" ? -1 : 1;
      return {
        cash: acc.cash + r.cashAmount * sign,
        credit: acc.credit + r.creditAmount * sign,
      };
    }, { cash: 0, credit: 0 });

  const todayNet = sumNet(todaySales);
  const weekNet = sumNet(weekSales);
  const todayTotal = todayNet.cash + todayNet.credit;
  const weekTotal = weekNet.cash + weekNet.credit;
  const weekCash = weekNet.cash;
  const weekCredit = weekNet.credit;

  const salesByCenterMap = new Map<string, number>();
  for (const s of allSales30) {
    if (s.date < weekStart || s.date > weekEnd) continue;
    const sign = s.type === "refund" ? -1 : 1;
    const cur = salesByCenterMap.get(s.centerId) ?? 0;
    salesByCenterMap.set(s.centerId, cur + (s.cashAmount + s.creditAmount) * sign);
  }
  const salesByCenter = Array.from(salesByCenterMap.entries()).map(([centerId, total]) => ({ centerId, total }));
  const centerNameById = Object.fromEntries(centers.map((c) => [c.id, c.name]));

  const dailyTotals = new Map<string, number>();
  for (const s of allSales30) {
    const key = s.date.toISOString().slice(0, 10);
    const sign = s.type === "refund" ? -1 : 1;
    dailyTotals.set(key, (dailyTotals.get(key) ?? 0) + (s.cashAmount + s.creditAmount) * sign);
  }
  const chartData = Array.from(dailyTotals.entries())
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <>
      <PageHeader title="Dashboard" description="Today, this week, last 30 days" />
      <PageBody>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Kpi label="Sales today" value={money(todayTotal)} />
          <Kpi
            label="Sales this week"
            value={money(weekTotal)}
            sub={`${money(weekCash)} cash · ${money(weekCredit)} credit`}
          />
          <Kpi label="Active employees" value={String(activeEmployees)} />
          <Kpi label="Open orders" value={String(openOrders)} />
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

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
        <div className="text-2xl font-semibold mt-1">{value}</div>
        {sub && <div className="text-xs text-zinc-400 mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}
