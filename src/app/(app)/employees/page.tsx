import { prisma } from "@/lib/prisma";
import { PageHeader, PageBody } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { money } from "@/lib/format";
import { subDays } from "date-fns";
import { EmployeeFormDialog } from "./employee-form-dialog";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const since = subDays(new Date(), 30);
  const [employees, centers, salesAgg] = await Promise.all([
    prisma.employee.findMany({
      orderBy: { fullName: "asc" },
      include: { center: true },
    }),
    prisma.shoppingCenter.findMany({ orderBy: { name: "asc" } }),
    prisma.dailySale.groupBy({
      by: ["employeeId"],
      _sum: { cashAmount: true, creditAmount: true },
      where: { date: { gte: since } },
    }),
  ]);
  const salesByEmp = Object.fromEntries(
    salesAgg.map((r) => [r.employeeId, (r._sum.cashAmount ?? 0) + (r._sum.creditAmount ?? 0)])
  );

  return (
    <>
      <PageHeader
        title="Employees"
        description="The people working in your centers"
        action={<EmployeeFormDialog centers={centers.map((c) => ({ id: c.id, name: c.name }))} />}
      />
      <PageBody>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Center</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Sales (last 30d)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-zinc-500 py-12">
                      No employees yet.
                    </TableCell>
                  </TableRow>
                )}
                {employees.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.fullName}</TableCell>
                    <TableCell className="text-zinc-600">{e.center?.name ?? "—"}</TableCell>
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
                    <TableCell className="text-right font-medium">{money(salesByEmp[e.id] ?? 0)}</TableCell>
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
