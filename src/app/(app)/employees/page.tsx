import { prisma } from "@/lib/prisma";
import { PageHeader, PageBody } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RankedBarChart } from "@/components/ranked-bar-chart";
import { SortableTable, type SortColumn } from "@/components/sortable-table";
import { Kpi } from "@/components/kpi";
import { Trophy, TrendingUp, Star, Award } from "lucide-react";
import { businessTodayUTC, money } from "@/lib/format";
import { addDaysUTC, weekdayLabel } from "@/lib/season";
import { sellerMetrics, lowAttendanceWeeks } from "@/lib/metrics";
import { LowAttendance } from "./low-attendance";
import { EmployeeFormDialog } from "./employee-form-dialog";
import { SalespersonSales } from "./salesperson-sales";

export const dynamic = "force-dynamic";

// Fewer days than this and one lucky shift would top the average.
const MIN_DAYS_FOR_AVG = 3;

const ROLE_LABEL: Record<string, string> = {
  employee: "Employee",
  region_manager: "Region manager",
  owner: "Owner",
};

const COLUMNS: SortColumn[] = [
  { key: "name", label: "Name", kind: "text" },
  { key: "role", label: "Role", kind: "text" },
  { key: "today", label: "Today", kind: "money" },
  { key: "d7", label: "Sales (7d)", kind: "money" },
  { key: "d30", label: "Sales (30d)", kind: "money" },
  { key: "ytd", label: "Sales (YTD)", kind: "money", strong: true },
  { key: "daysWorked", label: "Days worked", kind: "int" },
  { key: "avgPerDay", label: "Avg / day", kind: "money" },
  { key: "bestDay", label: "Best day", kind: "money", sub: "bestDayDate" },
  { key: "share", label: "% of sales", kind: "percent" },
  { key: "payout", label: "Payout", kind: "money" },
];

export default async function EmployeesPage() {
  const today = businessTodayUTC();
  const yearStart = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
  const thirtyAgo = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
  const oldest = thirtyAgo < yearStart ? thirtyAgo : yearStart;

  const [employees, sales] = await Promise.all([
    prisma.employee.findMany({ orderBy: { fullName: "asc" } }),
    prisma.employeeSale.findMany({
      where: { dailySale: { date: { gte: oldest, lte: today } } },
      select: {
        employeeId: true,
        amount: true,
        dailySale: { select: { date: true, center: { select: { name: true } } } },
      },
    }),
  ]);
  const metrics = sellerMetrics(
    sales.map((s) => ({ employeeId: s.employeeId, amount: s.amount, date: s.dailySale.date })),
    today
  );

  // Highlight cards (year to date, except "this week")
  const weekStart = addDaysUTC(today, -((today.getUTCDay() + 6) % 7));
  const weekBySeller = new Map<string, number>();
  for (const s of sales) {
    if (s.dailySale.date >= weekStart) weekBySeller.set(s.employeeId, (weekBySeller.get(s.employeeId) ?? 0) + s.amount);
  }
  const nameById = Object.fromEntries(employees.map((e) => [e.id, e.fullName]));
  const ranked = Object.entries(metrics);
  const top = <T,>(list: [string, T][], score: (x: T) => number) =>
    list.reduce<[string, T] | null>((best, x) => (!best || score(x[1]) > score(best[1]) ? x : best), null);
  const mostSales = top(ranked, (m) => m.ytd);

  // Weekly attendance: weeks with 0–1 days worked; owners and inactive employees excluded
  const lowWeeks = lowAttendanceWeeks(
    sales.map((s) => ({ employeeId: s.employeeId, date: s.dailySale.date })),
    today
  );
  const lowAttendance = employees
    .filter((e) => e.role !== "owner" && e.status === "active" && lowWeeks[e.id])
    .map((e) => ({ id: e.id, name: e.fullName, weeks: lowWeeks[e.id] }))
    .sort((a, b) => b.weeks.length - a.weeks.length || a.name.localeCompare(b.name));
  const bestAvg = top(
    ranked.filter(([, m]) => m.daysWorked >= MIN_DAYS_FOR_AVG),
    (m) => m.avgPerDay ?? 0
  );
  const bestDay = top(ranked, (m) => m.bestDay ?? 0);
  const topWeek = top([...weekBySeller.entries()], (v) => v);

  const teamYtd = Object.values(metrics).reduce((t, m) => t + m.ytd, 0);

  const rows = employees.map((e) => {
    const m = metrics[e.id];
    return {
      id: e.id,
      name: e.fullName,
      role: ROLE_LABEL[e.role] ?? e.role,
      today: m?.today || null,
      d7: m?.d7 ?? 0,
      d30: m?.d30 ?? 0,
      ytd: m?.ytd ?? 0,
      daysWorked: m?.daysWorked ?? 0,
      avgPerDay: m?.avgPerDay ?? null,
      bestDay: m?.bestDay ?? null,
      bestDayDate: m?.bestDayDate ?? null,
      share: m?.share ?? null,
      payout: e.payout > 0 ? e.payout : null,
    };
  });

  return (
    <>
      <PageHeader title="Employees" description="People in your business" action={<EmployeeFormDialog />} />
      <PageBody>
        <LowAttendance people={lowAttendance} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Kpi
            label="Most sales (YTD)"
            tone="emerald"
            icon={Trophy}
            compact
            value={mostSales ? `${nameById[mostSales[0]]} · ${money(mostSales[1].ytd)}` : "—"}
            sub={mostSales ? `Over ${mostSales[1].daysWorked} days worked` : "No sales yet"}
          />
          <Kpi
            label="Highest average / day"
            tone="sky"
            icon={TrendingUp}
            compact
            value={bestAvg ? `${nameById[bestAvg[0]]} · ${money(bestAvg[1].avgPerDay ?? 0)}` : "—"}
            sub={bestAvg ? `Over ${bestAvg[1].daysWorked} days worked` : `Needs ${MIN_DAYS_FOR_AVG}+ days worked`}
          />
          <Kpi
            label="Best single day"
            tone="amber"
            icon={Star}
            compact
            value={bestDay?.[1].bestDay ? `${nameById[bestDay[0]]} · ${money(bestDay[1].bestDay)}` : "—"}
            sub={bestDay?.[1].bestDayDate ? weekdayLabel(new Date(bestDay[1].bestDayDate)) : "No sales yet"}
          />
          <Kpi
            label="Top salesperson this week"
            tone="rose"
            icon={Award}
            compact
            value={topWeek ? `${nameById[topWeek[0]]} · ${money(topWeek[1])}` : "—"}
            sub={topWeek ? "Monday to today" : "No sales this week yet"}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <Card className="min-w-0 flex flex-col">
            <CardHeader>
              <CardTitle>Sales by salesperson (YTD)</CardTitle>
              <p className="text-xs text-zinc-500">Total by salespeople: {money(teamYtd)}.</p>
            </CardHeader>
            <CardContent className="mt-auto">
              <RankedBarChart
                kind="money"
                color="blue"
                label="Year to date"
                data={employees.map((e) => ({ name: e.fullName, value: metrics[e.id]?.ytd ?? 0 }))}
              />
            </CardContent>
          </Card>
          <Card className="min-w-0 flex flex-col">
            <CardHeader>
              <CardTitle>Share of sales by salesperson (YTD)</CardTitle>
              <p className="text-xs text-zinc-500">Each person&apos;s part of the team total. Adds up to 100%.</p>
            </CardHeader>
            <CardContent className="mt-auto">
              <RankedBarChart
                kind="percent"
                color="orange"
                label="Share of sales"
                data={employees.map((e) => ({ name: e.fullName, value: metrics[e.id]?.share ?? 0 }))}
              />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Salespeople</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <SortableTable
              columns={COLUMNS}
              rows={rows}
              defaultSort={{ key: "ytd", dir: "desc" }}
              empty="No employees yet."
            />
          </CardContent>
        </Card>
        <p className="mt-3 text-xs text-zinc-500">
          7d and 30d include today. Days worked, average, best day and % of sales are year to date. Click a column
          header to sort.
        </p>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Sales by date</CardTitle>
            <p className="text-xs text-zinc-500">Pick a salesperson to see every day they sold, newest first.</p>
          </CardHeader>
          <CardContent className="p-0 pb-2">
            <SalespersonSales
              people={employees
                .filter((e) => metrics[e.id])
                .map((e) => ({ id: e.id, name: e.fullName }))
                .sort((a, b) => a.name.localeCompare(b.name))}
              sales={sales.map((s) => ({
                employeeId: s.employeeId,
                date: s.dailySale.date.toISOString().slice(0, 10),
                centre: s.dailySale.center.name,
                amount: s.amount,
              }))}
              initialId={mostSales?.[0] ?? ""}
            />
          </CardContent>
        </Card>
      </PageBody>
    </>
  );
}
