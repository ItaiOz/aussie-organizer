"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createApartment(fd: FormData) {
  const address = String(fd.get("address") ?? "").trim();
  if (!address) return { ok: false, error: "Address required" } as const;
  await prisma.apartment.create({
    data: {
      address,
      city: String(fd.get("city") ?? "").trim() || null,
      bedrooms: Number(fd.get("bedrooms") ?? 1) || 1,
      monthlyRent: Number(fd.get("monthlyRent") ?? 0) || 0,
      landlord: String(fd.get("landlord") ?? "").trim() || null,
    },
  });
  revalidatePath("/apartments");
  return { ok: true } as const;
}

export async function assignEmployee(fd: FormData) {
  const apartmentId = String(fd.get("apartmentId") ?? "").trim();
  const employeeId = String(fd.get("employeeId") ?? "").trim();
  const moveInDate = String(fd.get("moveInDate") ?? "").trim();
  if (!apartmentId || !employeeId || !moveInDate) return { ok: false, error: "Missing fields" } as const;
  await prisma.apartmentAssignment.create({
    data: { apartmentId, employeeId, moveInDate: new Date(moveInDate) },
  });
  revalidatePath("/apartments");
  return { ok: true } as const;
}
