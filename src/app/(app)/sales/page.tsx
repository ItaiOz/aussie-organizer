import { prisma } from "@/lib/prisma";
import { PageHeader, PageBody } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { money, fmtDate } from "@/lib/format";
import { startOfWeek, endOfWeek, subWeeks, format } from "date-fns";
import { SaleFormDialog } from "./sale-form-dialog";

export const dynamic = "force-dynamic";

const WEEKS_BACK = 6;

export default async function SalesPage() {
  const now = new Date();
  const weeks: { start: Date; end: Date; key: string; label: string }[] = [];
  for (let i = 0; i < WEEKS_BACK; i++) {
    const ref = subWeeks(now, i);
    const start = startOfWeek(ref, { weekStartsOn: 1 });
    const end = endOfWeek(ref, { weekStartsOn: 1 });
    weeks.push({ start, end, key: format(start, "yyyy-MM-dd"), label: `${format(start, "d MMM")} – ${format(end, "d MMM")}` });
  }

  const oldestStart = weeks[weeks.length - 1].start;

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
      select: { date: true, centerId: true, employeeId: true, cashAmount: true, creditAmount: true },
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
    const c = byCenter[s.centerId]?.[w.key];
    if (c) {
      c.cash += s.cashAmount;
      c.credit += s.creditAmount;
      c.total = c.cash + c.credit;
    }
    const e = byEmployee[s.employeeId]?.[w.key];
    if (e) {
      e.cash += s.cashAmount;
      e.credit += s.creditAmount;
      e.total = e.cash + e.credit;
    }
  }

  return (
    <>
      <PageHeader
        title="Sales"
        description="Weekly breakdown by center and by employee"
        action={
          <SaleFormDialog
            employees={employees.map((e) => ({
              id: e.id,
              fullName: e.fullName,
              centerId: e.centerId,
              centerName: e.center?.name ?? null,
            }))}
          />
        }
      />
      <PageBody>
        <Tabs defaultValue="by-center" className="mb-6">
          <TabsList>
            <TabsTrigger value="by-center">By center</TabsTrigger>
            <TabsTrigger value="by-employee">By employee</TabsTrigger>
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
                  <TableHead>Employee</TableHead>
                  <TableHead>Center</TableHead>
                  <TableHead className="text-right">Cash</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-zinc-500 py-12">
                      No sales recorded yet.
                    </TableCell>
                  </TableRow>
                )}
                {sales.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-zinc-600">{fmtDate(s.date)}</TableCell>
                    <TableCell className="font-medium">{s.employee.fullName}</TableCell>
                    <TableCell className="text-zinc-600">{s.center.name}</TableCell>
                    <TableCell className="text-right">{money(s.cashAmount)}</TableCell>
                    <TableCell className="text-right">{money(s.creditAmount)}</TableCell>
                    <TableCell className="text-right font-semibold">{money(s.cashAmount + s.creditAmount)}</TableCell>
                    <TableCell className="text-zinc-500 text-sm">{s.notes ?? "—"}</TableCell>
                  </TableRow>
                ))}
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
                        <div className="font-medium">{money(cell.total)}</div>
                        <div className="text-xs text-zinc-400">
                          C {money(cell.cash)} · Cr {money(cell.credit)}
                        </div>
                      </div>
                    )}
                  </TableCell>
                );
              })}
              <TableCell className="text-right font-semibold">{money(rowTotal)}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
