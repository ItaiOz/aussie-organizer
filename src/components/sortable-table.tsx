"use client";
import { useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";

type Value = string | number | null;
export type SortRow = { id: string } & Record<string, Value>;

export type SortColumn = {
  key: string;
  label: string;
  // text: plain · money / int / percent: numbers · trend: signed % (green/red)
  // alert: count shown red when > 0 · status: active/inactive pill · date: yyyy-MM-dd
  kind: "text" | "money" | "int" | "percent" | "trend" | "alert" | "status" | "date";
  // Optional row key shown as small grey text under the value (e.g. a date)
  sub?: string;
  strong?: boolean;
};

const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

function render(col: SortColumn, v: Value) {
  if (v === null || v === "") return <span className="text-zinc-300">—</span>;
  switch (col.kind) {
    case "money":
      return money(v as number);
    case "int":
      return String(v);
    case "percent":
      return `${((v as number) * 100).toFixed(1)}%`;
    case "trend": {
      const n = v as number;
      return (
        <span className={n > 0 ? "text-green-700" : n < 0 ? "text-red-600" : ""}>
          {n > 0 ? "↑" : n < 0 ? "↓" : ""} {Math.abs(n * 100).toFixed(0)}%
        </span>
      );
    }
    case "alert":
      return <span className={(v as number) > 0 ? "font-semibold text-red-600" : "text-zinc-400"}>{v}</span>;
    case "status":
      return (
        <span
          className={
            v === "active"
              ? "text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700"
              : "text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600"
          }
        >
          {v}
        </span>
      );
    case "date":
      return fmtDay(v as string);
    default:
      return v;
  }
}

const isNumeric = (c: SortColumn) => !["text", "status", "date"].includes(c.kind);

export function SortableTable({
  columns,
  rows,
  defaultSort,
  empty = "Nothing to show yet.",
}: {
  columns: SortColumn[];
  rows: SortRow[];
  defaultSort: { key: string; dir: "asc" | "desc" };
  empty?: string;
}) {
  const [sort, setSort] = useState(defaultSort);

  const sorted = [...rows].sort((a, b) => {
    const x = a[sort.key];
    const y = b[sort.key];
    // Empty values always last, whichever direction
    if (x === null || x === "") return y === null || y === "" ? 0 : 1;
    if (y === null || y === "") return -1;
    const cmp = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
    return sort.dir === "asc" ? cmp : -cmp;
  });

  const onSort = (c: SortColumn) =>
    setSort((s) =>
      s.key === c.key ? { key: c.key, dir: s.dir === "asc" ? "desc" : "asc" } : { key: c.key, dir: isNumeric(c) ? "desc" : "asc" }
    );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((c, i) => {
            const active = sort.key === c.key;
            const Icon = active ? (sort.dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
            return (
              <TableHead
                key={c.key}
                className={cn(isNumeric(c) && "text-right", i === 0 && "sticky left-0 bg-white", "whitespace-nowrap")}
                aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
              >
                <button
                  type="button"
                  onClick={() => onSort(c)}
                  className={cn(
                    "inline-flex items-center gap-1 uppercase tracking-wide hover:text-zinc-900",
                    active && "text-zinc-900"
                  )}
                >
                  {c.label}
                  <Icon className={cn("h-3 w-3", !active && "opacity-40")} />
                </button>
              </TableHead>
            );
          })}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.length === 0 && (
          <TableRow>
            <TableCell colSpan={columns.length} className="text-center text-zinc-500 py-12">
              {empty}
            </TableCell>
          </TableRow>
        )}
        {sorted.map((r) => (
          <TableRow key={r.id}>
            {columns.map((c, i) => (
              <TableCell
                key={c.key}
                className={cn(
                  isNumeric(c) && "text-right",
                  i === 0 && "sticky left-0 bg-white font-medium",
                  c.strong && "font-semibold",
                  "whitespace-nowrap"
                )}
              >
                {render(c, r[c.key])}
                {c.sub && r[c.sub] && r[c.key] !== null && (
                  <div className="text-xs font-normal text-zinc-400">{fmtDay(r[c.sub] as string)}</div>
                )}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
