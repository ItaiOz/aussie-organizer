import { format, startOfWeek, endOfWeek } from "date-fns";

const AUD = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  minimumFractionDigits: 2,
});

export function money(n: number | null | undefined) {
  return AUD.format(n ?? 0);
}

export function pct(n: number | null | undefined) {
  return `${((n ?? 0) * 100).toFixed(1)}%`;
}

export function fmtDate(d: Date | string | null | undefined, p = "dd MMM yyyy") {
  if (!d) return "—";
  return format(typeof d === "string" ? new Date(d) : d, p);
}

export function weekRange(date: Date) {
  return {
    start: startOfWeek(date, { weekStartsOn: 1 }),
    end: endOfWeek(date, { weekStartsOn: 1 }),
  };
}

export function isoWeekKey(date: Date) {
  const { start } = weekRange(date);
  return format(start, "yyyy-MM-dd");
}

// Parse a yyyy-MM-dd form value as a calendar date at UTC midnight, so the
// stored value is identical no matter which timezone the server runs in.
export function dateOnlyUTC(s: string) {
  return new Date(s.slice(0, 10));
}

// Today's calendar date where the business runs (Queensland), as UTC midnight
// to match how sale dates are stored.
export function businessTodayUTC() {
  return dateOnlyUTC(new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Brisbane" }).format(new Date()));
}

// Current hour (0-23) in Brisbane.
export function businessHour() {
  return Number(new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Brisbane", hour: "numeric", hourCycle: "h23" }).format(new Date()));
}
