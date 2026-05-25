"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { startOfDay } from "date-fns";

export async function createSale(fd: FormData) {
  const centerId = String(fd.get("centerId") ?? "").trim();
  const employeeIdRaw = String(fd.get("employeeId") ?? "").trim();
  const employeeId = employeeIdRaw || undefined;
  const dateStr = String(fd.get("date") ?? "").trim();
  const cashAmount = Number(fd.get("cashAmount") ?? 0);
  const creditAmount = Number(fd.get("creditAmount") ?? 0);
  const typeRaw = String(fd.get("type") ?? "sale").trim();
  const type = typeRaw === "refund" ? "refund" : "sale";
  const notes = String(fd.get("notes") ?? "").trim() || null;

  if (!centerId) return { ok: false, error: "Pick a center" } as const;
  if (!dateStr) return { ok: false, error: "Date required" } as const;
  if (isNaN(cashAmount) || cashAmount < 0) return { ok: false, error: "Cash invalid" } as const;
  if (isNaN(creditAmount) || creditAmount < 0) return { ok: false, error: "Credit invalid" } as const;
  if (cashAmount === 0 && creditAmount === 0) return { ok: false, error: "Enter at least one amount" } as const;

  const date = startOfDay(new Date(dateStr));

  await prisma.dailySale.create({
    data: { type, centerId, employeeId, date, cashAmount, creditAmount, notes },
  });

  revalidatePath("/sales");
  revalidatePath("/dashboard");
  revalidatePath("/employees");
  return { ok: true } as const;
}
