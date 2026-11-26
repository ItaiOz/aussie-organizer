import { prisma } from "@/lib/prisma";
import { businessTodayUTC, money } from "@/lib/format";
import { dayLabel } from "@/lib/season";
import { endOfDayWeeks, END_OF_DAY_CATEGORY } from "@/lib/metrics";

export type EndOfDayLine = {
  id: string;
  title: string;
  amount: number;
  category: string;
  paidBy: string;
  datePaid: Date;
  notes: string;
  auto: true;
};

// One read-only expense line per week from the expenses staff enter on daily reports.
export async function endOfDayExpenseLines(): Promise<EndOfDayLine[]> {
  const items = await prisma.dailySaleExpense.findMany({
    select: { amount: true, dailySale: { select: { date: true, center: { select: { name: true } } } } },
  });
  const weeks = endOfDayWeeks(
    items.map((i) => ({ date: i.dailySale.date, centre: i.dailySale.center.name, amount: i.amount })),
    businessTodayUTC()
  );
  return weeks.map((w) => ({
    id: `end-of-day-${w.weekStart.toISOString().slice(0, 10)}`,
    title: `End-of-day expenses (cash) · ${dayLabel(w.weekStart)} – ${dayLabel(w.weekEnd)}${w.inProgress ? " (in progress)" : ""}`,
    amount: w.amount,
    category: END_OF_DAY_CATEGORY,
    paidBy: "Cash",
    datePaid: w.weekEnd,
    notes: w.byCentre.map((c) => `${c.centre} ${money(c.amount)}`).join(" · "),
    auto: true,
  }));
}
