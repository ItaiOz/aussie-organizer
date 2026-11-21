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
