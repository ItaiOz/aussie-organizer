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
