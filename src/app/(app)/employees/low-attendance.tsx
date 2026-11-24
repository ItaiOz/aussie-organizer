import { CircleAlert, CircleCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LowWeek } from "@/lib/metrics";

const DAY = 24 * 60 * 60 * 1000;
const fmt = (d: Date) => d.toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "UTC" });
const weekLabel = (iso: string) => {
  const mon = new Date(iso);
  return `${fmt(mon)} – ${fmt(new Date(mon.getTime() + 6 * DAY))}`;
};

// Salespeople with missing entries: more than one day in a Monday–Sunday week with no sales entry.
export function LowAttendance({ people }: { people: { id: string; name: string; weeks: LowWeek[] }[] }) {
  const ok = people.length === 0;
  const Icon = ok ? CircleCheck : CircleAlert;
  return (
    <Card className="relative mb-6 overflow-hidden">
      <div className={cn("absolute inset-x-0 top-0 h-1", ok ? "bg-emerald-500" : "bg-red-500")} />
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("rounded-md p-1.5", ok ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")}>
            <Icon className="h-4 w-4" />
          </span>
          <h2 className="text-sm font-semibold text-zinc-900">Missing salesperson entries</h2>
          <span
            className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}
          >
            {ok
              ? "No missing entries"
              : `${people.length} ${people.length === 1 ? "person" : "people"} with missing entries`}
          </span>
        </div>

        {!ok && (
          <ul className="space-y-2">
            {people.map((p) => (
              <li key={p.id} className="flex flex-wrap items-start gap-x-3 gap-y-1.5">
                <span className="w-40 shrink-0 pt-1 text-sm font-medium text-zinc-900">{p.name}</span>
                <span className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                  {p.weeks.map((w) => (
                    <span
                      key={w.weekStart}
                      className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700"
                    >
                      {w.current ? "This week" : weekLabel(w.weekStart)}
                      <span className="font-normal opacity-80">
                        · {w.off} days with no entry{w.current ? " so far" : ""}
                      </span>
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
