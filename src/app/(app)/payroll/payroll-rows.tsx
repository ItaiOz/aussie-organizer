"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/format";
import { upsertPayroll, markPaid } from "./actions";

type Row = {
  employeeId: string;
  fullName: string;
  role: string;
  salesTotal: number;
  payroll: {
    id: string;
    baseAmount: number;
    commissionAmount: number;
    bonusAmount: number;
    deductions: number;
    totalAmount: number;
    status: string;
  } | null;
};

export function PayrollRows({ rows, weekStart }: { rows: Row[]; weekStart: string }) {
  return (
    <TableBody>
      {rows.length === 0 && (
        <TableRow>
          <TableCell colSpan={10} className="text-center text-zinc-500 py-12">
            No active employees.
          </TableCell>
        </TableRow>
      )}
      {rows.map((r) => (
        <PayrollRow key={r.employeeId} row={r} weekStart={weekStart} />
      ))}
    </TableBody>
  );
}

function PayrollRow({ row, weekStart }: { row: Row; weekStart: string }) {
  const p = row.payroll;
  const [editing, setEditing] = useState(false);
  const [base, setBase] = useState(p?.baseAmount ?? 0);
  const [commission, setCommission] = useState(p?.commissionAmount ?? 0);
  const [bonus, setBonus] = useState(p?.bonusAmount ?? 0);
  const [deductions, setDeductions] = useState(p?.deductions ?? 0);
  const [pending, startTransition] = useTransition();

  const total = base + commission + bonus - deductions;
  const isPaid = p?.status === "paid";

  if (!editing) {
    return (
      <TableRow>
        <TableCell className="font-medium">{row.fullName}</TableCell>
        <TableCell className="text-zinc-600">{row.role === "region_manager" ? "Region manager" : "Employee"}</TableCell>
        <TableCell className="text-right">{money(row.salesTotal)}</TableCell>
        <TableCell className="text-right">{p ? money(p.baseAmount) : "—"}</TableCell>
        <TableCell className="text-right">{p ? money(p.commissionAmount) : "—"}</TableCell>
        <TableCell className="text-right">{p ? money(p.bonusAmount) : "—"}</TableCell>
        <TableCell className="text-right">{p ? money(p.deductions) : "—"}</TableCell>
        <TableCell className="text-right font-semibold">{p ? money(p.totalAmount) : "—"}</TableCell>
        <TableCell>
          {p ? (
            <span
              className={
                p.status === "paid"
                  ? "text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700"
                  : "text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700"
              }
            >
              {p.status}
            </span>
          ) : (
            <span className="text-xs text-zinc-400">not generated</span>
          )}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              {p ? "Edit" : "Set"}
            </Button>
            {p && !isPaid && (
              <Button
                size="sm"
                onClick={() =>
                  startTransition(async () => {
                    await markPaid(p.id);
                    toast.success("Marked paid");
                  })
                }
                disabled={pending}
              >
                Mark paid
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{row.fullName}</TableCell>
      <TableCell className="text-zinc-600">{row.role === "region_manager" ? "Region manager" : "Employee"}</TableCell>
      <TableCell className="text-right">{money(row.salesTotal)}</TableCell>
      <TableCell>
        <Input type="number" step="0.01" min="0" value={base} onChange={(e) => setBase(Number(e.target.value))} className="text-right" />
      </TableCell>
      <TableCell>
        <Input type="number" step="0.01" min="0" value={commission} onChange={(e) => setCommission(Number(e.target.value))} className="text-right" />
      </TableCell>
      <TableCell>
        <Input type="number" step="0.01" min="0" value={bonus} onChange={(e) => setBonus(Number(e.target.value))} className="text-right" />
      </TableCell>
      <TableCell>
        <Input type="number" step="0.01" min="0" value={deductions} onChange={(e) => setDeductions(Number(e.target.value))} className="text-right" />
      </TableCell>
      <TableCell className="text-right font-semibold">{money(total)}</TableCell>
      <TableCell></TableCell>
      <TableCell className="text-right">
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() =>
              startTransition(async () => {
                await upsertPayroll({
                  employeeId: row.employeeId,
                  weekStart,
                  baseAmount: base,
                  commissionAmount: commission,
                  bonusAmount: bonus,
                  deductions,
                });
                toast.success("Saved");
                setEditing(false);
              })
            }
            disabled={pending}
          >
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
