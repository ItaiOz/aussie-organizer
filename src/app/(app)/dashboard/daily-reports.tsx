import { CircleAlert, CircleCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { REPORT_DUE_HOUR, type ReportStatus } from "@/lib/metrics";

const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

const chip = "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium";
const TODAY_CHIP = {
  reported: "border-emerald-200 bg-emerald-50 text-emerald-800",
  missing: "border-red-200 bg-red-50 text-red-700",
  // Before the deadline: just "working today", not a problem yet
  waiting: "border-sky-200 bg-sky-50 text-sky-800",
} as const;
const TODAY_NOTE = { reported: "✓", missing: "missing", waiting: "" } as const;
const rowLabel = "w-16 shrink-0 pt-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500";

// Every centre open today with its report status, plus earlier booked days with no report.
export function DailyReports({ status, afterDue }: { status: ReportStatus; afterDue: boolean }) {
  const allIn = status.missingCount === 0;
  const total = status.today.length;
  const done = status.today.filter((c) => c.state === "reported").length;
  const Icon = allIn ? CircleCheck : CircleAlert;

  return (
    <Card className="relative mb-6 overflow-hidden">
      <div className={cn("absolute inset-x-0 top-0 h-1", allIn ? "bg-emerald-500" : "bg-red-500")} />
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={cn("rounded-md p-1.5", allIn ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")}>
              <Icon className="h-4 w-4" />
            </span>
            <h2 className="text-sm font-semibold text-zinc-900">Daily reports</h2>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-semibold",
                allIn ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
              )}
            >
              {allIn ? "All reports in" : `${status.missingCount} missing`}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
          <span className={cn(rowLabel, !afterDue && "w-auto")}>{afterDue ? "Today" : "Working today"}</span>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            {status.today.map((c) => (
              <span key={c.id} className={cn(chip, TODAY_CHIP[c.state])}>
                {c.name}
                {TODAY_NOTE[c.state] && <span className="font-normal opacity-80">{TODAY_NOTE[c.state]}</span>}
              </span>
            ))}
            {total === 0 && <span className="pt-1 text-xs text-zinc-500">No centres booked today</span>}
          </div>
          {total > 0 && (
            <div className="flex items-center gap-2 pt-1 text-xs text-zinc-500">
              <span className="tabular-nums">
                {done} of {total} reported
                {!afterDue && done < total && ` · due ${REPORT_DUE_HOUR - 12}pm`}
              </span>
              <span className="h-1.5 w-20 overflow-hidden rounded-full bg-zinc-100">
                <span
                  className={cn("block h-full rounded-full", done === total ? "bg-emerald-500" : "bg-sky-500")}
                  style={{ width: `${(done / total) * 100}%` }}
                />
              </span>
            </div>
          )}
        </div>

        {status.earlier.length > 0 && (
          <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
            <span className={rowLabel}>Earlier</span>
            <div className="flex min-w-0 flex-1 flex-wrap gap-2">
              {status.earlier.flatMap((c) =>
                c.dates.map((d) => (
                  <span key={`${c.id}-${d}`} className={cn(chip, "border-red-200 bg-white text-red-700")}>
                    {c.name} · <span className="font-normal tabular-nums">{fmtDay(d)}</span>
                  </span>
                ))
              )}
            </div>
          </div>
        )}

        {status.unchecked.length > 0 && (
          <div className="text-xs text-amber-700">
            ⚠ {status.unchecked.join(", ")}: booking dates need fixing on Centres
          </div>
        )}
      </CardContent>
    </Card>
  );
}
