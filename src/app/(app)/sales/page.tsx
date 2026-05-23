import { prisma } from "@/lib/prisma";
import { PageHeader, PageBody } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
      select: { date: true, centerId: true, cashAmount: true, creditAmount: true },
    }),
  ]);

  // Build pivot: rows = centers, cols = weeks
  type Cell = { cash: number; credit: number; total: number };
  const matrix: Record<string, Record<string, Cell>> = {};
  for (const c of centers) matrix[c.id] = Object.fromEntries(weeks.map((w) => [w.key, { cash: 0, credit: 0, total: 0 }]));
  for (const s of weeklySales) {
    const w = weeks.find((w) => s.date >= w.start && s.date <= w.end);
    if (!w) continue;
    const cell = matrix[s.centerId]?.[w.key];
    if (!cell) continue;
    cell.cash += s.cashAmount;
    cell.credit += s.creditAmount;
    cell.total = cell.cash + cell.credit;
  }

  return (
    <>
      <PageHeader
        title="Daily sales"
        description="One entry per employee per day · cash and credit"
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
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>By center, by week (last {WEEKS_BACK} weeks)</CardTitle>
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
                  const row = matrix[c.id];
                  const rowTotal = Object.values(row).reduce((s, x) => s + x.total, 0);
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium sticky left-0 bg-white">{c.name}</TableCell>
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
          </CardContent>
        </Card>

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
