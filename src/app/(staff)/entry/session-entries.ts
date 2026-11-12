import { cookies } from "next/headers";

// IDs of DailySale rows submitted from this device. Kept for 2 days so they
// survive the browser closing; the screen only shows (and the server only
// allows editing) entries dated the device's current day, so they effectively
// vanish at the device's midnight.
const COOKIE = "staff_entries";
const MAX_AGE = 60 * 60 * 48;

export async function getOwnedIds(): Promise<string[]> {
  const jar = await cookies();
  try {
    const raw = jar.get(COOKIE)?.value;
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export async function saveOwnedIds(ids: string[]) {
  const jar = await cookies();
  jar.set(COOKIE, JSON.stringify(ids.slice(-30)), { httpOnly: true, sameSite: "lax", path: "/", maxAge: MAX_AGE });
}
