"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { dateOnlyUTC } from "@/lib/format";
import { EXPENSE_CATEGORIES, EXPENSE_PAID_BY } from "./categories";

type ExpenseInput = {
  title: string;
  amount: number;
  category: string;
  paidBy: string;
  datePaid: string;
  notes: string | null;
};

function validate(args: ExpenseInput): string | null {
  if (!args.title.trim()) return "Title required";
  if (isNaN(args.amount) || args.amount <= 0) return "Amount must be positive";
  if (!(EXPENSE_CATEGORIES as readonly string[]).includes(args.category)) return "Pick a category";
  if (!(EXPENSE_PAID_BY as readonly string[]).includes(args.paidBy)) return "Pick who paid";
  if (!args.datePaid) return "Date required";
  return null;
}

function toData(args: ExpenseInput) {
  return {
    title: args.title.trim(),
    amount: args.amount,
    category: args.category,
    paidBy: args.paidBy,
    datePaid: dateOnlyUTC(args.datePaid),
    notes: args.notes,
  };
}

export async function createExpense(args: ExpenseInput) {
  const error = validate(args);
  if (error) return { ok: false, error } as const;

  await prisma.expense.create({ data: toData(args) });

  revalidatePath("/expenses");
  return { ok: true } as const;
}

export async function updateExpense(id: string, args: ExpenseInput) {
  if (!id) return { ok: false, error: "Missing id" } as const;
  const error = validate(args);
  if (error) return { ok: false, error } as const;

  await prisma.expense.update({ where: { id }, data: toData(args) });

  revalidatePath("/expenses");
  return { ok: true } as const;
}

export async function deleteExpense(id: string) {
  if (!id) return { ok: false, error: "Missing id" } as const;
  await prisma.expense.delete({ where: { id } });
  revalidatePath("/expenses");
  return { ok: true } as const;
}
