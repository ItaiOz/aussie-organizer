"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createEmployee(fd: FormData) {
  const fullName = String(fd.get("fullName") ?? "").trim();
  if (!fullName) return { ok: false, error: "Name is required" } as const;
  const role = String(fd.get("role") ?? "employee");
  const payout = Number(fd.get("payout") ?? 0) || 0;
  await prisma.employee.create({
    data: { fullName, role, payout, status: "active" },
  });
  revalidatePath("/employees");
  return { ok: true } as const;
}
