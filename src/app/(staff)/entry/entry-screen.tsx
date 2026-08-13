"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, X, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { money, fmtDate } from "@/lib/format";
import { submitEntry, updateMyEntry, deleteMyEntry, type StaffEntryInput } from "./actions";

type Center = { id: string; name: string };
type Emp = { id: string; fullName: string };
type Submission = {
  id: string;
  centerId: string;
  centerName: string;
  date: string;
  cashAmount: number;
  cardAmount: number;
  refundAmount: number;
  notes: string | null;
  employeeSales: { employeeId: string; amount: number }[];
  expenses: { title: string; amount: number }[];
};

type SaleRow = { key: string; employeeId: string; amount: string };
type ExpenseRow = { key: string; title: string; amount: string };

const rowKey = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36);
const newSaleRow = (): SaleRow => ({ key: rowKey(), employeeId: "", amount: "" });
const newExpenseRow = (): ExpenseRow => ({ key: rowKey(), title: "", amount: "" });

export function EntryScreen({
  centers,
  employees,
  submissions,
}: {
  centers: Center[];
  employees: Emp[];
  submissions: Submission[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [centerId, setCenterId] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [cash, setCash] = useState("");
  const [card, setCard] = useState("");
  const [refund, setRefund] = useState("");
  const [notes, setNotes] = useState("");
  const [saleRows, setSaleRows] = useState<SaleRow[]>([newSaleRow()]);
  const [expenseRows, setExpenseRows] = useState<ExpenseRow[]>([]);
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setEditingId(null);
    setCenterId("");
    setDate(format(new Date(), "yyyy-MM-dd"));
    setCash("");
    setCard("");
    setRefund("");
    setNotes("");
    setSaleRows([newSaleRow()]);
    setExpenseRows([]);
  };

  const loadForEdit = (s: Submission) => {
    setEditingId(s.id);
    setCenterId(s.centerId);
    setDate(s.date);
    setCash(s.cashAmount > 0 ? String(s.cashAmount) : "");
    setCard(s.cardAmount > 0 ? String(s.cardAmount) : "");
    setRefund(s.refundAmount > 0 ? String(s.refundAmount) : "");
    setNotes(s.notes ?? "");
    setSaleRows(
      s.employeeSales.length > 0
        ? s.employeeSales.map((es) => ({ key: rowKey(), employeeId: es.employeeId, amount: String(es.amount) }))
        : [newSaleRow()]
    );
    setExpenseRows(s.expenses.map((ex) => ({ key: rowKey(), title: ex.title, amount: String(ex.amount) })));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const total = Number(cash || 0) + Number(card || 0) - Number(refund || 0);

  const onSubmit = () =>
    startTransition(async () => {
      const input: StaffEntryInput = {
        centerId,
        date,
        cashAmount: Number(cash || 0),
        cardAmount: Number(card || 0),
        refundAmount: Number(refund || 0),
        notes: notes.trim() || null,
        employeeSales: saleRows
          .filter((r) => r.employeeId && Number(r.amount || 0) > 0)
          .map((r) => ({ employeeId: r.employeeId, amount: Number(r.amount) })),
        expenses: expenseRows
          .filter((r) => r.title.trim() && Number(r.amount || 0) > 0)
          .map((r) => ({ title: r.title, amount: Number(r.amount) })),
      };
      const res = editingId ? await updateMyEntry(editingId, input) : await submitEntry(input);
      if (res.ok) {
        toast.success(editingId ? "Updated" : "Submitted — thank you!");
        reset();
      } else {
        toast.error(res.error ?? "Failed");
      }
    });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Edit your daily summary" : "Daily sales summary"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={onSubmit}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Shopping center</Label>
                <Select value={centerId} onValueChange={setCenterId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select center" />
                  </SelectTrigger>
                  <SelectContent>
                    {centers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Salespeople</Label>
                <Button type="button" variant="ghost" size="sm" onClick={() => setSaleRows((r) => [...r, newSaleRow()])}>
                  <Plus className="h-3 w-3" /> Add salesperson
                </Button>
              </div>
              {saleRows.map((row) => {
                const takenElsewhere = new Set(saleRows.filter((r) => r.key !== row.key).map((r) => r.employeeId));
                const options = employees.filter((e) => e.id === row.employeeId || !takenElsewhere.has(e.id));
                return (
                <div key={row.key} className="grid grid-cols-[1fr_110px_auto] gap-2 items-center">
                  <Select
                    value={row.employeeId}
                    onValueChange={(v) => setSaleRows((rs) => rs.map((r) => (r.key === row.key ? { ...r, employeeId: v } : r)))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {options.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="Amount"
                    value={row.amount}
                    onChange={(e) => setSaleRows((rs) => rs.map((r) => (r.key === row.key ? { ...r, amount: e.target.value } : r)))}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setSaleRows((rs) => (rs.length === 1 ? [newSaleRow()] : rs.filter((r) => r.key !== row.key)))}
                    aria-label="Remove salesperson"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                );
              })}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="cash">Cash</Label>
                <Input id="cash" type="number" min="0" step="0.01" inputMode="decimal" value={cash} onChange={(e) => setCash(e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="card">Credit</Label>
                <Input id="card" type="number" min="0" step="0.01" inputMode="decimal" value={card} onChange={(e) => setCard(e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="refund" className="text-red-600">Refunds</Label>
                <Input
                  id="refund"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={refund}
                  onChange={(e) => setRefund(e.target.value)}
                  placeholder="0.00"
                  className="border-red-200 text-red-700 focus-visible:ring-red-300"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md bg-zinc-50 px-3 py-2 text-sm">
              <span className="text-zinc-500">Total (cash + credit − refunds)</span>
              <span className={"font-semibold " + (total < 0 ? "text-red-600" : "")}>{money(total)}</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Expenses</Label>
                <Button type="button" variant="ghost" size="sm" onClick={() => setExpenseRows((r) => [...r, newExpenseRow()])}>
                  <Plus className="h-3 w-3" /> Add expense
                </Button>
              </div>
              {expenseRows.length === 0 && <p className="text-sm text-zinc-400">No expenses — add one if you paid for anything today.</p>}
              {expenseRows.map((row) => (
                <div key={row.key} className="grid grid-cols-[1fr_110px_auto] gap-2 items-center">
                  <Input
                    placeholder="What was it for?"
                    value={row.title}
                    onChange={(e) => setExpenseRows((rs) => rs.map((r) => (r.key === row.key ? { ...r, title: e.target.value } : r)))}
                  />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="Amount"
                    value={row.amount}
                    onChange={(e) => setExpenseRows((rs) => rs.map((r) => (r.key === row.key ? { ...r, amount: e.target.value } : r)))}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setExpenseRows((rs) => rs.filter((r) => r.key !== row.key))}
                    aria-label="Remove expense"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything to flag?" />
            </div>

            <div className="flex gap-2">
              {editingId && (
                <Button type="button" variant="ghost" className="flex-1" onClick={reset}>
                  Cancel edit
                </Button>
              )}
              <Button type="submit" className="flex-1" disabled={pending}>
                {pending ? "Saving…" : editingId ? "Update summary" : "Submit summary"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {submissions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your submissions (this session)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {submissions.map((s) => {
              const net = s.cashAmount + s.cardAmount - s.refundAmount;
              return (
                <div key={s.id} className="rounded-md border border-zinc-200 p-3 flex items-start justify-between gap-3">
                  <div className="text-sm">
                    <div className="font-medium">
                      {s.centerName} · {fmtDate(s.date)}
                    </div>
                    <div className="text-zinc-500 mt-0.5">
                      Cash {money(s.cashAmount)} · Credit {money(s.cardAmount)}
                      {s.refundAmount > 0 && <> · Refunds −{money(s.refundAmount)}</>}
                      {" · "}
                      <span className={"font-semibold " + (net < 0 ? "text-red-600" : "text-zinc-900")}>{money(net)}</span>
                    </div>
                    {s.expenses.length > 0 && (
                      <div className="text-zinc-500 mt-0.5">
                        Expenses: {s.expenses.map((ex) => `${ex.title} (${money(ex.amount)})`).join(", ")}
                      </div>
                    )}
                    {s.notes && <div className="text-zinc-400 mt-0.5">{s.notes}</div>}
                  </div>
                  <div className="flex shrink-0">
                    <Button variant="ghost" size="icon" aria-label="Edit submission" onClick={() => loadForEdit(s)}>
                      <Pencil className="h-4 w-4 text-zinc-400" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete submission"
                      disabled={pending}
                      onClick={() => {
                        if (!confirm(`Delete the summary for ${s.centerName} on ${fmtDate(s.date)}?`)) return;
                        startTransition(async () => {
                          const res = await deleteMyEntry(s.id);
                          if (res.ok) {
                            toast.success("Deleted");
                            if (editingId === s.id) reset();
                          } else toast.error(res.error ?? "Failed");
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-zinc-400" />
                    </Button>
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-zinc-400">
              You can edit or delete these until you sign out or close the browser.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
