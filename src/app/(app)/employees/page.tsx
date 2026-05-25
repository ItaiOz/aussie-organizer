import { prisma } from "@/lib/prisma";
import { PageHeader, PageBody } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { money } from "@/lib/format";
import { subDays } from "date-fns";
import { EmployeeFormDialog } from "./employee-form-dialog";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  employee: "Employee",
  region_manager: "Region manager",
};

export default async function EmployeesPage() {
  const since = subDays(new Date(), 30);
  const [employees, salesAgg] = await Promise.all([
    prisma.employee.findMany({ orderBy: { fullName: "asc" } }),
    prisma.employeeSale.groupBy({
      by: ["employeeId"],
      _sum: { amount: true },
      where: { dailySale: { date: { gte: since } } },
    }),
  ]);
  const salesByEmp = Object.fromEntries(salesAgg.map((r) => [r.employeeId, r._sum.amount ?? 0]));

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
                  <TableHead className="text-right">Sales (last 30d)</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-zinc-500 py-12">
                      No employees yet.
                    </TableCell>
                  </TableRow>
                )}
                {employees.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.fullName}</TableCell>
                    <TableCell className="text-zinc-600">{ROLE_LABEL[e.role] ?? e.role}</TableCell>
                    <TableCell className="text-right">{e.payout > 0 ? money(e.payout) : <span className="text-zinc-300">—</span>}</TableCell>
                    <TableCell className="text-right font-medium">{money(salesByEmp[e.id] ?? 0)}</TableCell>
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
