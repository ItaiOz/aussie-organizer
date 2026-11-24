"use client";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { money } from "@/lib/format";

type Person = { id: string; name: string };
type Sale = { employeeId: string; date: string; centre: string; amount: number };

const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

// Pick a salesperson, see each of their sales by date (newest first).
export function SalespersonSales({ people, sales, initialId }: { people: Person[]; sales: Sale[]; initialId: string }) {
  const [id, setId] = useState(initialId);
  const rows = sales.filter((s) => s.employeeId === id).sort((a, b) => b.date.localeCompare(a.date));
  const total = rows.reduce((t, s) => t + s.amount, 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 px-4 pt-1">
        <Label htmlFor="salesperson" className="text-xs text-zinc-500">
          Salesperson
        </Label>
        <Select value={id} onValueChange={setId}>
          <SelectTrigger id="salesperson" className="h-8 w-56">
            <SelectValue placeholder="Pick a salesperson" />
          </SelectTrigger>
          <SelectContent>
            {people.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Centre</TableHead>
            <TableHead className="text-right">Sales</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-zinc-500 py-10">
                No sales recorded for this person yet.
              </TableCell>
            </TableRow>
          )}
          {rows.map((s, i) => (
            <TableRow key={`${s.date}-${s.centre}-${i}`}>
              <TableCell className="whitespace-nowrap font-medium">{fmtDay(s.date)}</TableCell>
              <TableCell className="text-zinc-600">{s.centre}</TableCell>
              <TableCell className="text-right">{money(s.amount)}</TableCell>
            </TableRow>
          ))}
          {rows.length > 0 && (
            <TableRow className="border-t-2 border-zinc-300 bg-zinc-50 hover:bg-zinc-50">
              <TableCell className="font-semibold">Total</TableCell>
              <TableCell className="text-zinc-500">
                {rows.length} day{rows.length === 1 ? "" : "s"}
              </TableCell>
              <TableCell className="text-right font-semibold">{money(total)}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
