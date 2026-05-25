"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const VALID_STATUSES = ["need_to_contact", "contacted", "booked"] as const;
type Status = (typeof VALID_STATUSES)[number];

function isStatus(v: string): v is Status {
  return (VALID_STATUSES as readonly string[]).includes(v);
}

function parseFormData(fd: FormData) {
  const name = String(fd.get("name") ?? "").trim();
  const statusRaw = String(fd.get("status") ?? "need_to_contact");
  const status: Status = isStatus(statusRaw) ? statusRaw : "need_to_contact";
  const bookedFromStr = String(fd.get("bookedFrom") ?? "").trim();
  const bookedToStr = String(fd.get("bookedTo") ?? "").trim();
  return {
    name,
    status,
    region: String(fd.get("region") ?? "").trim() || null,
    contactName: String(fd.get("contactName") ?? "").trim() || null,
    bookedFrom: bookedFromStr ? new Date(bookedFromStr) : null,
    bookedTo: bookedToStr ? new Date(bookedToStr) : null,
    notes: String(fd.get("notes") ?? "").trim() || null,
  };
}

export async function createCenter(fd: FormData) {
  const data = parseFormData(fd);
  if (!data.name) return { ok: false, error: "Name is required" } as const;
  await prisma.shoppingCenter.create({ data });
  revalidatePath("/centers");
  return { ok: true } as const;
}

export async function updateCenter(id: string, fd: FormData) {
  const data = parseFormData(fd);
  if (!data.name) return { ok: false, error: "Name is required" } as const;
  await prisma.shoppingCenter.update({ where: { id }, data });
  revalidatePath("/centers");
  return { ok: true } as const;
}

export async function deleteCenter(id: string) {
  await prisma.$transaction([
    prisma.dailySale.deleteMany({ where: { centerId: id } }),
    prisma.shoppingCenter.delete({ where: { id } }),
  ]);
  revalidatePath("/centers");
  revalidatePath("/sales");
  revalidatePath("/dashboard");
  return { ok: true } as const;
}

export async function moveCenter(args: { id: string; toStatus: string; toIndex: number }) {
  if (!isStatus(args.toStatus)) return { ok: false, error: "Invalid status" } as const;
  await prisma.shoppingCenter.update({
    where: { id: args.id },
    data: { status: args.toStatus },
  });
  revalidatePath("/centers");
  return { ok: true } as const;
}
