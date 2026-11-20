import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Static class strings so Tailwind keeps them in the build.
const TONES = {
  zinc: { bar: "bg-zinc-300", icon: "bg-zinc-100 text-zinc-600", value: "text-zinc-900" },
  sky: { bar: "bg-sky-500", icon: "bg-sky-50 text-sky-600", value: "text-sky-700" },
  emerald: { bar: "bg-emerald-500", icon: "bg-emerald-50 text-emerald-600", value: "text-emerald-700" },
  amber: { bar: "bg-amber-500", icon: "bg-amber-50 text-amber-600", value: "text-amber-700" },
  violet: { bar: "bg-violet-500", icon: "bg-violet-50 text-violet-600", value: "text-violet-700" },
  rose: { bar: "bg-rose-500", icon: "bg-rose-50 text-rose-600", value: "text-rose-700" },
} as const;

export type KpiTone = keyof typeof TONES;

export function Kpi({
  label,
  value,
  sub,
  tone = "zinc",
  icon: Icon,
  change,
  compact = false,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: KpiTone;
  icon?: LucideIcon;
  // Relative change vs a comparison period; null when there's nothing to compare with.
  change?: { value: number | null; vs: string };
  // Smaller value text for longer values such as "Name · $1,234.00"
  compact?: boolean;
}) {
  const t = TONES[tone];
  return (
    <Card className="relative overflow-hidden">
      <div className={cn("absolute inset-x-0 top-0 h-1", t.bar)} />
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
          {Icon && (
            <div className={cn("rounded-md p-1.5 shrink-0", t.icon)}>
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>
        <div className={cn("font-semibold mt-1 whitespace-pre-line", compact ? "text-lg leading-snug" : "text-2xl", t.value)}>
          {value}
        </div>
        {change && (
          <div
            className={cn(
              "text-xs font-medium mt-1",
              change.value === null ? "text-zinc-400" : change.value >= 0 ? "text-green-700" : "text-red-600"
            )}
          >
            {change.value === null
              ? `No sales ${change.vs} to compare`
              : `${change.value >= 0 ? "↑" : "↓"} ${Math.abs(change.value * 100).toFixed(0)}% vs ${change.vs}`}
          </div>
        )}
        {sub && <div className="text-xs text-zinc-500 mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}
