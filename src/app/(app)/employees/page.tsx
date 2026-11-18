import { prisma } from "@/lib/prisma";
import { PageHeader, PageBody } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { money, businessTodayUTC } from "@/lib/format";
import { subDays } from "date-fns";
import { EmployeeFormDialog } from "./employee-form-dialog";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  employee: "Employee",
  region_manager: "Region manager",
};

export default async function EmployeesPage() {
  // Windows include today: last 7 days = today + the 6 days before.
  const today = businessTodayUTC();
  const since7 = subDays(today, 6);
  const since30 = subDays(today, 29);
  const yearStart = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
  const oldest = since30 < yearStart ? since30 : yearStart;

  const [employees, sales] = await Promise.all([
    prisma.employee.findMany({ orderBy: { fullName: "asc" } }),
    prisma.employeeSale.findMany({
      where: { dailySale: { date: { gte: oldest, lte: today } } },
      select: { employeeId: true, amount: true, dailySale: { select: { date: true } } },
    }),
  ]);
  const totals: Record<string, { d7: number; d30: number; ytd: number }> = {};
  for (const s of sales) {
    const t = (totals[s.employeeId] ??= { d7: 0, d30: 0, ytd: 0 });
    const d = s.dailySale.date;
    if (d >= since7) t.d7 += s.amount;
    if (d >= since30) t.d30 += s.amount;
    if (d >= yearStart) t.ytd += s.amount;
  }

  return (
    <>
      <PageHeader title="Employees" description="People in your business" action={<EmployeeFormDialog />} />
      <PageBody>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Payout</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Sales (7d)</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Sales (30d)</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Sales (YTD)</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-zinc-500 py-12">
                      No employees yet.
                    </TableCell>
                  </TableRow>
                )}
                {employees.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.fullName}</TableCell>
                    <TableCell className="text-zinc-600">{ROLE_LABEL[e.role] ?? e.role}</TableCell>
                    <TableCell className="text-right">{e.payout > 0 ? money(e.payout) : <span className="text-zinc-300">—</span>}</TableCell>
                    <TableCell className="text-right">{money(totals[e.id]?.d7 ?? 0)}</TableCell>
                    <TableCell className="text-right">{money(totals[e.id]?.d30 ?? 0)}</TableCell>
                    <TableCell className="text-right font-medium">{money(totals[e.id]?.ytd ?? 0)}</TableCell>
                    <TableCell>
                      <span
                        className={
                          e.status === "active"
                            ? "text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700"
                            : "text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600"
                        }
                      >
                        {e.status}
                      </span>
                    </TableCell>
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
