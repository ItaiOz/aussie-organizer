"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { weekRange } from "@/lib/format";

export async function generateDrafts(weekStartStr: string) {
  const { start, end } = weekRange(new Date(weekStartStr + "T00:00:00"));

  const employees = await prisma.employee.findMany({ where: { status: "active" } });
  const salesAgg = await prisma.employeeSale.groupBy({
    by: ["employeeId"],
    _sum: { amount: true },
    where: { dailySale: { date: { gte: start, lte: end } } },
  });
  const salesByEmp = Object.fromEntries(salesAgg.map((r) => [r.employeeId, r._sum.amount ?? 0]));

  let created = 0;
  for (const e of employees) {
    const existing = await prisma.weeklyPayroll.findUnique({
      where: { employeeId_weekStartDate: { employeeId: e.id, weekStartDate: start } },
    });
    if (existing) continue;
    await prisma.weeklyPayroll.create({
      data: {
        employeeId: e.id,
        weekStartDate: start,
        weekEndDate: end,
        salesTotal: salesByEmp[e.id] ?? 0,
        baseAmount: 0,
        commissionAmount: 0,
        bonusAmount: 0,
        deductions: 0,
        totalAmount: 0,
        status: "draft",
      },
    });
    created++;
  }
  revalidatePath("/payroll");
  return { ok: true, created } as const;
}

export async function upsertPayroll(args: {
  employeeId: string;
  weekStart: string;
  baseAmount: number;
  commissionAmount: number;
  bonusAmount: number;
  deductions: number;
}) {
  const { start, end } = weekRange(new Date(args.weekStart + "T00:00:00"));
  const total = args.baseAmount + args.commissionAmount + args.bonusAmount - args.deductions;
  const empSalesAgg = await prisma.employeeSale.aggregate({
    _sum: { amount: true },
    where: { employeeId: args.employeeId, dailySale: { date: { gte: start, lte: end } } },
  });
  const salesTotalForWeek = empSalesAgg._sum.amount ?? 0;
  await prisma.weeklyPayroll.upsert({
    where: { employeeId_weekStartDate: { employeeId: args.employeeId, weekStartDate: start } },
    create: {
      employeeId: args.employeeId,
      weekStartDate: start,
      weekEndDate: end,
      baseAmount: args.baseAmount,
      commissionAmount: args.commissionAmount,
      bonusAmount: args.bonusAmount,
      deductions: args.deductions,
      totalAmount: total,
      salesTotal: salesTotalForWeek,
      status: "draft",
    },
    update: {
      baseAmount: args.baseAmount,
      commissionAmount: args.commissionAmount,
      bonusAmount: args.bonusAmount,
      deductions: args.deductions,
      totalAmount: total,
      salesTotal: salesTotalForWeek,
    },
  });
  revalidatePath("/payroll");
  return { ok: true } as const;
}

export async function markPaid(id: string) {
  await prisma.weeklyPayroll.update({
    where: { id },
    data: { status: "paid", paidAt: new Date() },
  });
  revalidatePath("/payroll");
  return { ok: true } as const;
}
