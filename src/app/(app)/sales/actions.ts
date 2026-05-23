"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { startOfDay } from "date-fns";

export async function createSale(fd: FormData) {
  const employeeId = String(fd.get("employeeId") ?? "").trim();
  const dateStr = String(fd.get("date") ?? "").trim();
  const cashAmount = Number(fd.get("cashAmount") ?? 0);
  const creditAmount = Number(fd.get("creditAmount") ?? 0);
  const notes = String(fd.get("notes") ?? "").trim() || null;

  if (!employeeId) return { ok: false, error: "Pick an employee" } as const;
  if (!dateStr) return { ok: false, error: "Date required" } as const;
  if (isNaN(cashAmount) || cashAmount < 0) return { ok: false, error: "Cash invalid" } as const;
  if (isNaN(creditAmount) || creditAmount < 0) return { ok: false, error: "Credit invalid" } as const;

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee?.centerId) return { ok: false, error: "Employee has no center assigned" } as const;

  const date = startOfDay(new Date(dateStr));

  await prisma.dailySale.upsert({
    where: { employeeId_date: { employeeId, date } },
    create: { employeeId, centerId: employee.centerId, date, cashAmount, creditAmount, notes },
    update: { cashAmount, creditAmount, notes, centerId: employee.centerId },
  });

  revalidatePath("/sales");
  revalidatePath("/dashboard");
  revalidatePath("/employees");
  return { ok: true } as const;
}
