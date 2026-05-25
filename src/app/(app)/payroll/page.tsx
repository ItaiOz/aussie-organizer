import { prisma } from "@/lib/prisma";
import { PageHeader, PageBody } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { money, fmtDate } from "@/lib/format";
import { weekRange } from "@/lib/format";
import { startOfWeek, addWeeks, subWeeks, format } from "date-fns";
import { WeekPicker } from "./week-picker";
import { GenerateButton } from "./generate-button";
import { PayrollRows } from "./payroll-rows";

export const dynamic = "force-dynamic";

type Search = { week?: string };

export default async function PayrollPage(props: { searchParams: Promise<Search> }) {
  const sp = await props.searchParams;
  const baseDate = sp.week ? new Date(sp.week + "T00:00:00") : new Date();
  const { start, end } = weekRange(baseDate);

  const [employees, payrolls, salesAgg] = await Promise.all([
    prisma.employee.findMany({
      where: { status: "active" },
      orderBy: { fullName: "asc" },
    }),
    prisma.weeklyPayroll.findMany({
      where: { weekStartDate: start },
      include: { employee: true },
    }),
    prisma.employeeSale.groupBy({
      by: ["employeeId"],
      _sum: { amount: true },
      where: { dailySale: { date: { gte: start, lte: end } } },
    }),
  ]);

  const payrollByEmp = Object.fromEntries(payrolls.map((p) => [p.employeeId, p]));
  const salesByEmp = Object.fromEntries(salesAgg.map((r) => [r.employeeId, r._sum.amount ?? 0]));

  const rows = employees.map((e) => ({
    employeeId: e.id,
    fullName: e.fullName,
    role: e.role,
    salesTotal: salesByEmp[e.id] ?? 0,
    payroll: payrollByEmp[e.id]
      ? {
          id: payrollByEmp[e.id].id,
          baseAmount: payrollByEmp[e.id].baseAmount,
          commissionAmount: payrollByEmp[e.id].commissionAmount,
          bonusAmount: payrollByEmp[e.id].bonusAmount,
          deductions: payrollByEmp[e.id].deductions,
          totalAmount: payrollByEmp[e.id].totalAmount,
          status: payrollByEmp[e.id].status,
        }
      : null,
  }));

  const weekTotal = rows.reduce((s, r) => s + (r.payroll?.totalAmount ?? 0), 0);
  const salesTotal = rows.reduce((s, r) => s + r.salesTotal, 0);

  const prevWeek = format(subWeeks(start, 1), "yyyy-MM-dd");
  const nextWeek = format(addWeeks(start, 1), "yyyy-MM-dd");

  return (
    <>
      <PageHeader
        title="Weekly payroll"
        description={`${fmtDate(start)} – ${fmtDate(end)}`}
        action={<WeekPicker current={format(start, "yyyy-MM-dd")} prev={prevWeek} next={nextWeek} />}
      />
      <PageBody>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-5">
              <div className="text-xs uppercase tracking-wide text-zinc-500">Sales this week</div>
              <div className="text-2xl font-semibold mt-1">{money(salesTotal)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="text-xs uppercase tracking-wide text-zinc-500">Payroll cost</div>
              <div className="text-2xl font-semibold mt-1">{money(weekTotal)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="text-xs uppercase tracking-wide text-zinc-500">Labour ratio</div>
              <div className="text-2xl font-semibold mt-1">
                {salesTotal > 0 ? `${((weekTotal / salesTotal) * 100).toFixed(1)}%` : "—"}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
              <div className="text-sm text-zinc-600">
                {rows.length} active employee{rows.length === 1 ? "" : "s"}
              </div>
              <GenerateButton weekStart={format(start, "yyyy-MM-dd")} />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Center</TableHead>
                  <TableHead className="text-right">Sales</TableHead>
                  <TableHead className="text-right">Base</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead className="text-right">Bonus</TableHead>
                  <TableHead className="text-right">Deductions</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <PayrollRows rows={rows} weekStart={format(start, "yyyy-MM-dd")} />
            </Table>
          </CardContent>
        </Card>
      </PageBody>
    </>
  );
}
