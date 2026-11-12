import { prisma } from "@/lib/prisma";
import { EntryScreen } from "./entry-screen";
import { getOwnedIds } from "./session-entries";

export const dynamic = "force-dynamic";

export default async function EntryPage() {
  const ownedIds = await getOwnedIds();
  const [centers, employees, mine] = await Promise.all([
    prisma.shoppingCenter.findMany({ where: { status: "booked" }, orderBy: { name: "asc" } }),
    prisma.employee.findMany({ where: { status: "active" }, orderBy: { fullName: "asc" } }),
    ownedIds.length
      ? prisma.dailySale.findMany({
          where: { id: { in: ownedIds } },
          include: { center: true, employeeSales: true, saleExpenses: true },
          orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        })
      : Promise.resolve([]),
  ]);

  return (
    <EntryScreen
      centers={centers.map((c) => ({ id: c.id, name: c.name }))}
      employees={employees.map((e) => ({ id: e.id, fullName: e.fullName }))}
      submissions={mine.map((s) => ({
        id: s.id,
        centerId: s.centerId,
        centerName: s.center.name,
        date: s.date.toISOString().slice(0, 10),
        createdAt: s.createdAt.toISOString(),
        cashAmount: s.cashAmount,
        cardAmount: s.cardAmount,
        refundAmount: s.refundAmount,
        notes: s.notes,
        employeeSales: s.employeeSales.map((es) => ({ employeeId: es.employeeId, amount: es.amount })),
        expenses: s.saleExpenses.map((ex) => ({ title: ex.title, amount: ex.amount })),
      }))}
    />
  );
}
