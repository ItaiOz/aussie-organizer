import { cookies } from "next/headers";

// IDs of DailySale rows created by this browser session. Stored in a session
// cookie (no maxAge) so edit/delete rights disappear when the browser closes.
const COOKIE = "staff_entries";

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
  jar.set(COOKIE, JSON.stringify(ids.slice(-30)), { httpOnly: true, sameSite: "lax", path: "/" });
}
