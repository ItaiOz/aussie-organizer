"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { dateOnlyUTC } from "@/lib/format";
import { Prisma } from "@prisma/client";
import { getOwnedIds, saveOwnedIds } from "./session-entries";

export type StaffEntryInput = {
  centerId: string;
  date: string;
  cashAmount: number;
  cardAmount: number;
  refundAmount: number;
  notes: string | null;
  employeeSales: { employeeId: string; amount: number }[];
  expenses: { title: string; amount: number }[];
};

const ALREADY = "Sales for this center and date were already submitted. Please talk to your manager." as const;

function validate(args: StaffEntryInput): string | null {
  if (!args.centerId) return "Pick a shopping center";
  if (!args.date) return "Date required";
  for (const n of [args.cashAmount, args.cardAmount, args.refundAmount]) {
    if (isNaN(n) || n < 0) return "Amounts must be non-negative";
  }
  for (const es of args.employeeSales) {
    if (!es.employeeId || isNaN(es.amount) || es.amount < 0) return "Check the salespeople rows";
  }
  for (const ex of args.expenses) {
    if (!ex.title.trim() || isNaN(ex.amount) || ex.amount <= 0) return "Each expense needs a title and a positive amount";
  }
  return null;
}

function revalidateAll() {
  revalidatePath("/entry");
  revalidatePath("/sales");
  revalidatePath("/dashboard");
  revalidatePath("/employees");
  revalidatePath("/payroll");
}

export async function submitEntry(args: StaffEntryInput) {
  const error = validate(args);
  if (error) return { ok: false, error } as const;

  const date = dateOnlyUTC(args.date);
  try {
    const sale = await prisma.$transaction(async (tx) => {
      const created = await tx.dailySale.create({
        data: {
          centerId: args.centerId,
          date,
          cashAmount: args.cashAmount,
          cardAmount: args.cardAmount,
          refundAmount: args.refundAmount,
          notes: args.notes,
        },
      });
      if (args.employeeSales.length > 0) {
        await tx.employeeSale.createMany({
          data: args.employeeSales.map((es) => ({ dailySaleId: created.id, employeeId: es.employeeId, amount: es.amount })),
        });
      }
      if (args.expenses.length > 0) {
        await tx.dailySaleExpense.createMany({
          data: args.expenses.map((ex) => ({ dailySaleId: created.id, title: ex.title.trim(), amount: ex.amount })),
        });
      }
      return created;
    });
    await saveOwnedIds([...(await getOwnedIds()), sale.id]);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: ALREADY } as const;
    }
    throw e;
  }

  revalidateAll();
  return { ok: true } as const;
}

export async function updateMyEntry(id: string, args: StaffEntryInput) {
  const owned = await getOwnedIds();
  if (!owned.includes(id)) return { ok: false, error: "This entry can no longer be edited" } as const;
  const error = validate(args);
  if (error) return { ok: false, error } as const;

  const date = dateOnlyUTC(args.date);
  try {
    await prisma.$transaction(async (tx) => {
      await tx.dailySale.update({
        where: { id },
        data: {
          centerId: args.centerId,
          date,
          cashAmount: args.cashAmount,
          cardAmount: args.cardAmount,
          refundAmount: args.refundAmount,
          notes: args.notes,
        },
      });
      await tx.employeeSale.deleteMany({ where: { dailySaleId: id } });
      await tx.dailySaleExpense.deleteMany({ where: { dailySaleId: id } });
      if (args.employeeSales.length > 0) {
        await tx.employeeSale.createMany({
          data: args.employeeSales.map((es) => ({ dailySaleId: id, employeeId: es.employeeId, amount: es.amount })),
        });
      }
      if (args.expenses.length > 0) {
        await tx.dailySaleExpense.createMany({
          data: args.expenses.map((ex) => ({ dailySaleId: id, title: ex.title.trim(), amount: ex.amount })),
        });
      }
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: ALREADY } as const;
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return { ok: false, error: "This entry was deleted by a manager" } as const;
    }
    throw e;
  }

  revalidateAll();
  return { ok: true } as const;
}

export async function deleteMyEntry(id: string) {
  const owned = await getOwnedIds();
  if (!owned.includes(id)) return { ok: false, error: "This entry can no longer be deleted" } as const;

  await prisma.dailySale.deleteMany({ where: { id } });
  await saveOwnedIds(owned.filter((x) => x !== id));

  revalidateAll();
  return { ok: true } as const;
}
