"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { dateOnlyUTC } from "@/lib/format";

export async function createEmployee(fd: FormData) {
  const fullName = String(fd.get("fullName") ?? "").trim();
  if (!fullName) return { ok: false, error: "Name is required" } as const;
  const role = String(fd.get("role") ?? "employee");
  const payout = Number(fd.get("payout") ?? 0) || 0;
  // Work period (optional): first and last day they're expected to work
  const start = String(fd.get("startDate") ?? "");
  const end = String(fd.get("endDate") ?? "");
  const startDate = start ? dateOnlyUTC(start) : null;
  const endDate = end ? dateOnlyUTC(end) : null;
  if (startDate && endDate && endDate < startDate) return { ok: false, error: "Finished can't be before Started" } as const;
  await prisma.employee.create({
    data: { fullName, role, payout, status: "active", startDate, endDate },
  });
  revalidatePath("/employees");
  return { ok: true } as const;
}
