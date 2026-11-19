import { dateOnlyUTC } from "./format";

// The trading season: drives the Sales weekly table, center performance and
// dashboard records. Monday to Sunday weeks.
export const SEASON_FROM = "2026-11-09";
export const SEASON_TO = "2026-12-27";

export const DAY_MS = 24 * 60 * 60 * 1000;

export const seasonStart = () => dateOnlyUTC(SEASON_FROM);
export const seasonEnd = () => dateOnlyUTC(SEASON_TO);

// Date arithmetic on UTC-midnight calendar dates (how sale dates are stored).
export const addDaysUTC = (d: Date, n: number) => new Date(d.getTime() + n * DAY_MS);

export const dayLabel = (d: Date) =>
  d.toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "UTC" });

export const weekdayLabel = (d: Date) =>
  d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
