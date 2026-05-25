"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { weekRange } from "@/lib/format";

export async function generateDrafts(weekStartStr: string) {
  const { start, end } = weekRange(new Date(weekStartStr + "T00:00:00"));

  const employees = await prisma.employee.findMany({ where: { status: "active" } });
  const sales = await prisma.dailySale.findMany({
    where: { date: { gte: start, lte: end }, employeeId: { not: null } },
    select: { employeeId: true, type: true, cashAmount: true, creditAmount: true },
  });
  const salesByEmp: Record<string, number> = {};
  for (const r of sales) {
    if (!r.employeeId) continue;
    const sign = r.type === "refund" ? -1 : 1;
    salesByEmp[r.employeeId] = (salesByEmp[r.employeeId] ?? 0) + (r.cashAmount + r.creditAmount) * sign;
  }

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
  const empSales = await prisma.dailySale.findMany({
    where: { employeeId: args.employeeId, date: { gte: start, lte: end } },
    select: { type: true, cashAmount: true, creditAmount: true },
  });
  const salesTotalForWeek = empSales.reduce((acc, r) => {
    const sign = r.type === "refund" ? -1 : 1;
    return acc + (r.cashAmount + r.creditAmount) * sign;
  }, 0);
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
