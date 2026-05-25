import { prisma } from "@/lib/prisma";
import { PageHeader, PageBody } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { money, fmtDate } from "@/lib/format";
import { startOfWeek, endOfWeek, subWeeks, subDays, startOfDay, format } from "date-fns";
import { SaleFormDialog } from "./sale-form-dialog";
import { DailyChart } from "./daily-chart";

export const dynamic = "force-dynamic";

const WEEKS_BACK = 6;
const DAYS_BACK = 30;

export default async function SalesPage() {
  const now = new Date();
  const weeks: { start: Date; end: Date; key: string; label: string }[] = [];
  for (let i = 0; i < WEEKS_BACK; i++) {
    const ref = subWeeks(now, i);
    const start = startOfWeek(ref, { weekStartsOn: 1 });
    const end = endOfWeek(ref, { weekStartsOn: 1 });
    weeks.push({ start, end, key: format(start, "yyyy-MM-dd"), label: `${format(start, "d MMM")} – ${format(end, "d MMM")}` });
  }

  const oldestWeekStart = weeks[weeks.length - 1].start;
  const oldestDay = startOfDay(subDays(now, DAYS_BACK - 1));
  const oldestStart = oldestDay < oldestWeekStart ? oldestDay : oldestWeekStart;

  const [sales, employees, centers, weeklySales] = await Promise.all([
    prisma.dailySale.findMany({
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: { employee: true, center: true },
      take: 50,
    }),
    prisma.employee.findMany({
      where: { status: "active" },
      orderBy: { fullName: "asc" },
      include: { center: true },
    }),
    prisma.shoppingCenter.findMany({
      where: { status: "booked" },
      orderBy: { name: "asc" },
    }),
    prisma.dailySale.findMany({
      where: { date: { gte: oldestStart } },
      select: { date: true, type: true, centerId: true, employeeId: true, cashAmount: true, creditAmount: true },
    }),
  ]);

  type Cell = { cash: number; credit: number; total: number };
  const blankRow = () => Object.fromEntries(weeks.map((w) => [w.key, { cash: 0, credit: 0, total: 0 }])) as Record<string, Cell>;

  const byCenter: Record<string, Record<string, Cell>> = {};
  const byEmployee: Record<string, Record<string, Cell>> = {};
  for (const c of centers) byCenter[c.id] = blankRow();
  for (const e of employees) byEmployee[e.id] = blankRow();

  for (const s of weeklySales) {
    const w = weeks.find((w) => s.date >= w.start && s.date <= w.end);
    if (!w) continue;
    const sign = s.type === "refund" ? -1 : 1;
    const c = byCenter[s.centerId]?.[w.key];
    if (c) {
      c.cash += s.cashAmount * sign;
      c.credit += s.creditAmount * sign;
      c.total = c.cash + c.credit;
    }
    if (s.employeeId) {
      const e = byEmployee[s.employeeId]?.[w.key];
      if (e) {
        e.cash += s.cashAmount * sign;
        e.credit += s.creditAmount * sign;
        e.total = e.cash + e.credit;
      }
    }
  }

  // Daily aggregation (last DAYS_BACK days)
  type DailyCell = { date: string; label: string; cash: number; credit: number; refunds: number; net: number };
  const dailyMap = new Map<string, DailyCell>();
  for (let i = DAYS_BACK - 1; i >= 0; i--) {
    const d = startOfDay(subDays(now, i));
    const key = format(d, "yyyy-MM-dd");
    dailyMap.set(key, { date: key, label: format(d, "EEE, d MMM"), cash: 0, credit: 0, refunds: 0, net: 0 });
  }
  for (const s of weeklySales) {
    if (s.date < oldestDay) continue;
    const key = s.date.toISOString().slice(0, 10);
    const cell = dailyMap.get(key);
    if (!cell) continue;
    if (s.type === "refund") {
      cell.refunds += s.cashAmount + s.creditAmount;
      cell.net -= s.cashAmount + s.creditAmount;
    } else {
      cell.cash += s.cashAmount;
      cell.credit += s.creditAmount;
      cell.net += s.cashAmount + s.creditAmount;
    }
  }
  const dailyRows = Array.from(dailyMap.values()).reverse(); // newest first

  return (
    <>
      <PageHeader
        title="Sales"
        description="Weekly breakdown by center and by employee"
        action={
          <SaleFormDialog
            centers={centers.map((c) => ({ id: c.id, name: c.name }))}
            employees={employees.map((e) => ({
              id: e.id,
              fullName: e.fullName,
              centerId: e.centerId,
            }))}
          />
        }
      />
      <PageBody>
        <Tabs defaultValue="by-center" className="mb-6">
          <TabsList>
            <TabsTrigger value="by-center">By center</TabsTrigger>
            <TabsTrigger value="by-employee">By employee</TabsTrigger>
            <TabsTrigger value="daily">Daily</TabsTrigger>
          </TabsList>

          <TabsContent value="by-center">
            <Card>
              <CardHeader>
                <CardTitle>Sales by center, by week (last {WEEKS_BACK} weeks)</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <PivotTable
                  rows={centers.map((c) => ({ id: c.id, label: c.name, sub: null }))}
                  weeks={weeks}
                  matrix={byCenter}
                  emptyLabel="No booked centers yet."
                  rowHeader="Center"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="by-employee">
            <Card>
              <CardHeader>
                <CardTitle>Sales by employee, by week (last {WEEKS_BACK} weeks)</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <PivotTable
                  rows={employees.map((e) => ({
                    id: e.id,
                    label: e.fullName,
                    sub: e.center?.name ?? null,
                  }))}
                  weeks={weeks}
                  matrix={byEmployee}
                  emptyLabel="No active employees yet."
                  rowHeader="Employee"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="daily">
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Net sales — last {DAYS_BACK} days</CardTitle>
              </CardHeader>
              <CardContent className="h-56">
                <DailyChart data={[...dailyRows].reverse()} />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Cash</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead className="text-right">Refunds</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailyRows.map((d) => (
                      <TableRow key={d.date}>
                        <TableCell className="font-medium">{d.label}</TableCell>
                        <TableCell className="text-right">{d.cash === 0 ? <span className="text-zinc-300">—</span> : money(d.cash)}</TableCell>
                        <TableCell className="text-right">{d.credit === 0 ? <span className="text-zinc-300">—</span> : money(d.credit)}</TableCell>
                        <TableCell className="text-right text-red-600">{d.refunds === 0 ? <span className="text-zinc-300">—</span> : `−${money(d.refunds)}`}</TableCell>
                        <TableCell className={"text-right font-semibold " + (d.net < 0 ? "text-red-600" : d.net === 0 ? "text-zinc-300" : "")}>
                          {d.net === 0 ? "—" : money(d.net)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle>Recent entries</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Center</TableHead>
                  <TableHead>Salesperson</TableHead>
                  <TableHead className="text-right">Cash</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-zinc-500 py-12">
                      No sales recorded yet.
                    </TableCell>
                  </TableRow>
                )}
                {sales.map((s) => {
                  const isRefund = s.type === "refund";
                  const sign = isRefund ? -1 : 1;
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="text-zinc-600">{fmtDate(s.date)}</TableCell>
                      <TableCell>
                        {isRefund ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Refund</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Sale</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{s.center.name}</TableCell>
                      <TableCell className="text-zinc-600">{s.employee?.fullName ?? "—"}</TableCell>
                      <TableCell className={"text-right " + (isRefund ? "text-red-600" : "")}>
                        {money(s.cashAmount * sign)}
                      </TableCell>
                      <TableCell className={"text-right " + (isRefund ? "text-red-600" : "")}>
                        {money(s.creditAmount * sign)}
                      </TableCell>
                      <TableCell className={"text-right font-semibold " + (isRefund ? "text-red-600" : "")}>
                        {money((s.cashAmount + s.creditAmount) * sign)}
                      </TableCell>
                      <TableCell className="text-zinc-500 text-sm">{s.notes ?? "—"}</TableCell>
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

type Cell = { cash: number; credit: number; total: number };

function PivotTable({
  rows,
  weeks,
  matrix,
  emptyLabel,
  rowHeader,
}: {
  rows: { id: string; label: string; sub: string | null }[];
  weeks: { key: string; label: string }[];
  matrix: Record<string, Record<string, Cell>>;
  emptyLabel: string;
  rowHeader: string;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="sticky left-0 bg-white">{rowHeader}</TableHead>
          {weeks.map((w) => (
            <TableHead key={w.key} className="text-right whitespace-nowrap">
              {w.label}
            </TableHead>
          ))}
          <TableHead className="text-right whitespace-nowrap">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={weeks.length + 2} className="text-center text-zinc-500 py-12">
              {emptyLabel}
            </TableCell>
          </TableRow>
        )}
        {rows.map((r) => {
          const row = matrix[r.id];
          const rowTotal = Object.values(row).reduce((s, x) => s + x.total, 0);
          return (
            <TableRow key={r.id}>
              <TableCell className="sticky left-0 bg-white">
                <div className="font-medium">{r.label}</div>
                {r.sub && <div className="text-xs text-zinc-500">{r.sub}</div>}
              </TableCell>
              {weeks.map((w) => {
                const cell = row[w.key];
                return (
                  <TableCell key={w.key} className="text-right">
                    {cell.total === 0 ? (
                      <span className="text-zinc-300">—</span>
                    ) : (
                      <div>
                        <div className={"font-medium " + (cell.total < 0 ? "text-red-600" : "")}>{money(cell.total)}</div>
                        <div className="text-xs text-zinc-400">
                          C {money(cell.cash)} · Cr {money(cell.credit)}
                        </div>
                      </div>
                    )}
                  </TableCell>
                );
              })}
              <TableCell className={"text-right font-semibold " + (rowTotal < 0 ? "text-red-600" : "")}>
                {money(rowTotal)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
