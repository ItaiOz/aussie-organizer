import { addDaysUTC } from "./season";

// All dates are UTC-midnight calendar dates. `today` comes from businessTodayUTC().

export type SaleRow = {
  date: Date;
  centerId: string;
  cashAmount: number;
  cardAmount: number;
  refundAmount: number;
  expenseTotal: number;
};

export type CenterInfo = { id: string; name: string };

export type CenterMetrics = {
  id: string;
  name: string;
  total: number;
  share: number | null;
  days: number;
  avgPerDay: number | null;
  bestDay: number | null;
  bestDayDate: string | null;
  worstDay: number | null;
  worstDayDate: string | null;
  last7: number;
  trend7: number | null;
  creditShare: number | null;
  refundRate: number | null;
  expenses: number;
};

const net = (s: SaleRow) => s.cashAmount + s.cardAmount - s.refundAmount;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

// Sales between seasonFrom and today.
export function centerMetrics(
  centers: CenterInfo[],
  sales: SaleRow[],
  seasonFrom: Date,
  seasonTo: Date,
  today: Date
): CenterMetrics[] {
  const inSeason = sales.filter((s) => s.date >= seasonFrom && s.date <= seasonTo && s.date <= today);
  const grand = inSeason.reduce((t, s) => t + net(s), 0);
  const last7From = addDaysUTC(today, -6);
  const prev7From = addDaysUTC(today, -13);

  return centers.map((c) => {
    const rows = inSeason.filter((s) => s.centerId === c.id);
    const total = rows.reduce((t, s) => t + net(s), 0);
    const cash = rows.reduce((t, s) => t + s.cashAmount, 0);
    const card = rows.reduce((t, s) => t + s.cardAmount, 0);
    const refund = rows.reduce((t, s) => t + s.refundAmount, 0);
    const best = rows.reduce<SaleRow | null>((b, s) => (!b || net(s) > net(b) ? s : b), null);
    const worst = rows.reduce<SaleRow | null>((w, s) => (!w || net(s) < net(w) ? s : w), null);
    const last7 = rows.filter((s) => s.date >= last7From).reduce((t, s) => t + net(s), 0);
    const prev7 = rows.filter((s) => s.date >= prev7From && s.date < last7From).reduce((t, s) => t + net(s), 0);

    return {
      id: c.id,
      name: c.name,
      total,
      share: grand ? total / grand : null,
      days: rows.length,
      avgPerDay: rows.length ? total / rows.length : null,
      bestDay: best ? net(best) : null,
      bestDayDate: best ? isoDay(best.date) : null,
      worstDay: worst ? net(worst) : null,
      worstDayDate: worst ? isoDay(worst.date) : null,
      last7,
      trend7: prev7 ? (last7 - prev7) / prev7 : null,
      creditShare: cash + card ? card / (cash + card) : null,
      refundRate: cash + card ? refund / (cash + card) : null,
      expenses: rows.reduce((t, s) => t + s.expenseTotal, 0),
    };
  });
}

export type SellerSale = { employeeId: string; amount: number; date: Date };

export type SellerMetrics = {
  today: number;
  d7: number;
  d30: number;
  ytd: number;
  daysWorked: number;
  avgPerDay: number | null;
  bestDay: number | null;
  bestDayDate: string | null;
  share: number | null;
  lastWorked: string | null;
};

// Windows include today: last 7 days = today + the 6 days before. Days worked,
// average, best day and share are year to date.
export function sellerMetrics(sales: SellerSale[], today: Date): Record<string, SellerMetrics> {
  const since7 = addDaysUTC(today, -6);
  const since30 = addDaysUTC(today, -29);
  const yearStart = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
  const ytdSales = sales.filter((s) => s.date >= yearStart && s.date <= today);
  const grand = ytdSales.reduce((t, s) => t + s.amount, 0);

  const out: Record<string, SellerMetrics> = {};
  for (const s of ytdSales) {
    const m = (out[s.employeeId] ??= {
      today: 0,
      d7: 0,
      d30: 0,
      ytd: 0,
      daysWorked: 0,
      avgPerDay: null,
      bestDay: null,
      bestDayDate: null,
      share: null,
      lastWorked: null,
    });
    if (s.date.getTime() === today.getTime()) m.today += s.amount;
    if (s.date >= since7) m.d7 += s.amount;
    if (s.date >= since30) m.d30 += s.amount;
    m.ytd += s.amount;
    m.daysWorked++;
    if (m.bestDay === null || s.amount > m.bestDay) {
      m.bestDay = s.amount;
      m.bestDayDate = isoDay(s.date);
    }
    if (!m.lastWorked || isoDay(s.date) > m.lastWorked) m.lastWorked = isoDay(s.date);
  }
  for (const m of Object.values(out)) {
    m.avgPerDay = m.daysWorked ? m.ytd / m.daysWorked : null;
    m.share = grand ? m.ytd / grand : null;
  }
  return out;
}

// Daily report check. A centre is expected to report on every day from bookedFrom to
// bookedTo. Today only counts as missing from REPORT_DUE_HOUR (Brisbane); before that
// it's "waiting". A report with $0 counts as reported. Centres whose booking ended before
// yesterday are skipped; one that ended yesterday stays a day so its last day is checked.
export const REPORT_DUE_HOUR = 18;

export type ReportCentre = { id: string; name: string; bookedFrom: Date | null; bookedTo: Date | null; reported: Set<string> };

export type ReportStatus = {
  today: { id: string; name: string; state: "reported" | "waiting" | "missing" }[];
  earlier: { id: string; name: string; dates: string[] }[];
  // Booked centres whose dates can't be checked (missing or end before start)
  unchecked: string[];
  missingCount: number;
};

export function reportStatus(centres: ReportCentre[], today: Date, hour: number): ReportStatus {
  const todayKey = isoDay(today);
  const yesterday = addDaysUTC(today, -1);
  const out: ReportStatus = { today: [], earlier: [], unchecked: [], missingCount: 0 };

  for (const c of centres) {
    if (!c.bookedFrom || !c.bookedTo || c.bookedTo < c.bookedFrom) {
      out.unchecked.push(c.name);
      continue;
    }
    if (c.bookedTo < yesterday) continue;
    if (c.bookedFrom <= today && today <= c.bookedTo) {
      const state = c.reported.has(todayKey) ? "reported" : hour >= REPORT_DUE_HOUR ? "missing" : "waiting";
      out.today.push({ id: c.id, name: c.name, state });
      if (state === "missing") out.missingCount++;
    }
    const dates: string[] = [];
    const last = c.bookedTo < yesterday ? c.bookedTo : yesterday;
    for (let d = c.bookedFrom; d <= last; d = addDaysUTC(d, 1)) if (!c.reported.has(isoDay(d))) dates.push(isoDay(d));
    if (dates.length) {
      out.earlier.push({ id: c.id, name: c.name, dates: dates.reverse() });
      out.missingCount += dates.length;
    }
  }
  out.today.sort((a, b) => a.name.localeCompare(b.name));
  out.earlier.sort((a, b) => b.dates.length - a.dates.length || a.name.localeCompare(b.name));
  return out;
}

// Attendance check: everyone should work at least 6 days a week, i.e. at most
// MAX_DAYS_OFF days off per Monday–Sunday week. Weeks start counting from a person's
// first day worked (a part week only needs its own days minus one off). The current
// week is checked up to yesterday, so it alerts as soon as a second day off happens.
// A $0 sale row still counts as a day worked.
export const MAX_DAYS_OFF = 1;

export type LowWeek = { weekStart: string; worked: number; off: number; current: boolean };

// `periods` (optional) limits each person to their work period: nothing before their start
// date or after their end date counts (e.g. someone who finished working).
export function lowAttendanceWeeks(
  sales: { employeeId: string; date: Date }[],
  today: Date,
  periods: Record<string, { start: Date | null; end: Date | null }> = {}
): Record<string, LowWeek[]> {
  const mondayOf = (d: Date) => addDaysUTC(d, -((d.getUTCDay() + 6) % 7));
  const yesterday = addDaysUTC(today, -1);
  const daysByPerson = new Map<string, Set<string>>();
  for (const s of sales) {
    if (s.date > yesterday) continue;
    const set = daysByPerson.get(s.employeeId) ?? new Set<string>();
    set.add(isoDay(s.date));
    daysByPerson.set(s.employeeId, set);
  }

  const out: Record<string, LowWeek[]> = {};
  for (const [id, days] of daysByPerson) {
    const period = periods[id];
    const first = period?.start ?? new Date([...days].sort()[0]);
    const last = period?.end && period.end < yesterday ? period.end : yesterday;
    const weeks: LowWeek[] = [];
    for (let mon = mondayOf(first); mon <= last; mon = addDaysUTC(mon, 7)) {
      // Days of this week that count: within the work period, up to yesterday
      const from = mon < first ? first : mon;
      const sun = addDaysUTC(mon, 6);
      const to = sun < last ? sun : last;
      let worked = 0;
      let counted = 0;
      for (let d = from; d <= to; d = addDaysUTC(d, 1)) {
        counted++;
        if (days.has(isoDay(d))) worked++;
      }
      const off = counted - worked;
      if (off > MAX_DAYS_OFF) weeks.push({ weekStart: isoDay(mon), worked, off, current: to < sun && to === yesterday });
    }
    if (weeks.length) out[id] = weeks.reverse();
  }
  return out;
}

// End-of-day expenses: what staff enter on their daily reports (paid from the day's cash),
// rolled up into one line per Monday–Sunday week across all centres. Calculated on every page
// load, so new, edited or late entries always show; dated the week's Sunday.
export const END_OF_DAY_CATEGORY = "End-of-day expenses";

export type EndOfDayWeek = {
  weekStart: Date;
  weekEnd: Date;
  amount: number;
  byCentre: { centre: string; amount: number }[];
  inProgress: boolean;
};

export function endOfDayWeeks(items: { date: Date; centre: string; amount: number }[], today: Date): EndOfDayWeek[] {
  const weeks = new Map<string, EndOfDayWeek>();
  for (const it of items) {
    const mon = addDaysUTC(it.date, -((it.date.getUTCDay() + 6) % 7));
    const key = isoDay(mon);
    const w = weeks.get(key) ?? { weekStart: mon, weekEnd: addDaysUTC(mon, 6), amount: 0, byCentre: [], inProgress: false };
    w.amount += it.amount;
    const c = w.byCentre.find((x) => x.centre === it.centre);
    if (c) c.amount += it.amount;
    else w.byCentre.push({ centre: it.centre, amount: it.amount });
    weeks.set(key, w);
  }
  for (const w of weeks.values()) {
    w.inProgress = w.weekEnd >= today;
    w.byCentre.sort((a, b) => b.amount - a.amount);
  }
  return [...weeks.values()].sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime());
}
