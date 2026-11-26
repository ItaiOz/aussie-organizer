import { money } from "@/lib/format";

// One daily sales report's details (cash/credit/refunds/net, salespeople, expenses, notes).
// Used as tooltip content in the Sales by day grid and the dashboard's centre table.
export type GridEntry = {
  date: string; // yyyy-MM-dd
  centerId: string;
  cash: number;
  card: number;
  refund: number;
  notes: string | null;
  sellers: { name: string; amount: number }[];
  expenses: { title: string; amount: number }[];
};

const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const netOf = (e: GridEntry) => e.cash + e.card - e.refund;

export function EntryDetails({ centre, date, e }: { centre: string; date: string; e: GridEntry }) {
  return (
    <div className="space-y-1.5">
      <div className="font-semibold">
        {centre} · {fmtDay(date)}
      </div>
      <div className="grid grid-cols-[auto_auto] gap-x-3 tabular-nums">
        <span className="text-zinc-400">Cash</span>
        <span className="text-right">{money(e.cash)}</span>
        <span className="text-zinc-400">Credit</span>
        <span className="text-right">{money(e.card)}</span>
        {e.refund > 0 && (
          <>
            <span className="text-zinc-400">Refunds</span>
            <span className="text-right">−{money(e.refund)}</span>
          </>
        )}
        <span className="font-semibold">Net</span>
        <span className="text-right font-semibold">{money(netOf(e))}</span>
      </div>
      {e.sellers.length > 0 && (
        <div>
          <div className="text-zinc-400">Salespeople</div>
          {e.sellers.map((s) => (
            <div key={s.name}>
              {s.name} · {money(s.amount)}
            </div>
          ))}
        </div>
      )}
      {e.expenses.length > 0 && (
        <div>
          <div className="text-zinc-400">Expenses</div>
          {e.expenses.map((x, i) => (
            <div key={i}>
              {x.title} · {money(x.amount)}
            </div>
          ))}
        </div>
      )}
      {e.notes && (
        <div>
          <div className="text-zinc-400">Notes</div>
          <div>{e.notes}</div>
        </div>
      )}
    </div>
  );
}
