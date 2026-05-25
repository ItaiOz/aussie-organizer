"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { startOfDay } from "date-fns";

export async function getDailySale(centerId: string, dateStr: string) {
  if (!centerId || !dateStr) return null;
  const date = startOfDay(new Date(dateStr));
  const row = await prisma.dailySale.findUnique({
    where: { centerId_date: { centerId, date } },
    include: { employeeSales: true },
  });
  return row;
}

export async function saveDailySale(args: {
  centerId: string;
  date: string;
  cashAmount: number;
  cardAmount: number;
  refundAmount: number;
  notes: string | null;
  employeeSales: { employeeId: string; amount: number }[];
}) {
  if (!args.centerId) return { ok: false, error: "Pick a center" } as const;
  if (!args.date) return { ok: false, error: "Date required" } as const;
  for (const n of [args.cashAmount, args.cardAmount, args.refundAmount]) {
    if (isNaN(n) || n < 0) return { ok: false, error: "Amounts must be non-negative" } as const;
  }

  const date = startOfDay(new Date(args.date));

  await prisma.$transaction(async (tx) => {
    const sale = await tx.dailySale.upsert({
      where: { centerId_date: { centerId: args.centerId, date } },
      create: {
        centerId: args.centerId,
        date,
        cashAmount: args.cashAmount,
        cardAmount: args.cardAmount,
        refundAmount: args.refundAmount,
        notes: args.notes,
      },
      update: {
        cashAmount: args.cashAmount,
        cardAmount: args.cardAmount,
        refundAmount: args.refundAmount,
        notes: args.notes,
      },
    });
    await tx.employeeSale.deleteMany({ where: { dailySaleId: sale.id } });
    if (args.employeeSales.length > 0) {
      await tx.employeeSale.createMany({
        data: args.employeeSales.map((es) => ({
          dailySaleId: sale.id,
          employeeId: es.employeeId,
          amount: es.amount,
        })),
      });
    }
  });

  revalidatePath("/sales");
  revalidatePath("/dashboard");
  revalidatePath("/employees");
  revalidatePath("/payroll");
  return { ok: true } as const;
}
