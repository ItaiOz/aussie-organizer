"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createEmployee(fd: FormData) {
  const fullName = String(fd.get("fullName") ?? "").trim();
  if (!fullName) return { ok: false, error: "Name is required" } as const;
  const centerId = String(fd.get("centerId") ?? "").trim() || null;
  await prisma.employee.create({
    data: { fullName, centerId, status: "active" },
  });
  revalidatePath("/employees");
  return { ok: true } as const;
}
