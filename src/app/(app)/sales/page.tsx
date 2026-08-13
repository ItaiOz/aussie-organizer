import { prisma } from "@/lib/prisma";
import { PageHeader, PageBody } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { money, fmtDate } from "@/lib/format";
import { startOfWeek, endOfWeek, subWeeks, subDays, startOfDay, format } from "date-fns";
import { SaleFormDialog } from "./sale-form-dialog";
import { DailyTab } from "./daily-tab";

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

  const [recent, employees, centers, weeklySales] = await Promise.all([
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
      select: { date: true, centerId: true, cashAmount: true, cardAmount: true, refundAmount: true },
    }),
  ]);

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
        <Tabs defaultValue="by-center" className="mb-6">
          <TabsList>
            <TabsTrigger value="by-center">By center</TabsTrigger>
            <TabsTrigger value="daily">Daily</TabsTrigger>
          </TabsList>

          <TabsContent value="by-center">
            <Card>
              <CardHeader>
                <CardTitle>Sales by center, by week (last {WEEKS_BACK} weeks)</CardTitle>
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
                          <TableCell className="sticky left-0 bg-white font-medium">{c.name}</TableCell>
                          {weeks.map((w) => {
                            const cell = row[w.key];
                            return (
                              <TableCell key={w.key} className="text-right">
                                {cell.net === 0 ? (
                                  <span className="text-zinc-300">—</span>
                                ) : (
                                  <div>
                                    <div className={"font-medium " + (cell.net < 0 ? "text-red-600" : "")}>{money(cell.net)}</div>
                                    <div className="text-xs text-zinc-400">
                                      C {money(cell.cash)} · Cr {money(cell.card)}
                                      {cell.refund > 0 && <> · −{money(cell.refund)}</>}
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="daily">
            <DailyTab
              rows={dailyRows}
              centers={centers.map((c) => ({ id: c.id, name: c.name }))}
              days={DAYS_BACK}
            />
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
                      <TableCell className="text-zinc-600">{fmtDate(s.date)}</TableCell>
                      <TableCell className="font-medium">{s.center.name}</TableCell>
                      <TableCell className="text-right">{money(s.cashAmount)}</TableCell>
                      <TableCell className="text-right">{money(s.cardAmount)}</TableCell>
                      <TableCell className="text-right text-red-600">{s.refundAmount > 0 ? `−${money(s.refundAmount)}` : <span className="text-zinc-300">—</span>}</TableCell>
                      <TableCell className={"text-right font-semibold " + (net < 0 ? "text-red-600" : "")}>{money(net)}</TableCell>
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
