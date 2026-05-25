"use client";
import { useState, useTransition, useEffect } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { saveDailySale, getDailySale } from "./actions";

type Center = { id: string; name: string };
type Emp = { id: string; fullName: string };
type Row = { id: string; employeeId: string; amount: string };

const newRow = (): Row => ({
  id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36),
  employeeId: "",
  amount: "",
});

export function SaleFormDialog({ centers, employees }: { centers: Center[]; employees: Emp[] }) {
  const [open, setOpen] = useState(false);
  const [centerId, setCenterId] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [cash, setCash] = useState("");
  const [card, setCard] = useState("");
  const [refund, setRefund] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<Row[]>([newRow()]);
  const [isEditing, setIsEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setCenterId("");
    setDate(format(new Date(), "yyyy-MM-dd"));
    setCash("");
    setCard("");
    setRefund("");
    setNotes("");
    setRows([newRow()]);
    setIsEditing(false);
  };

  // Pre-fill from existing entry when center + date are chosen
  useEffect(() => {
    if (!open || !centerId || !date) return;
    let cancelled = false;
    (async () => {
      const existing = await getDailySale(centerId, date);
      if (cancelled) return;
      if (existing) {
        setIsEditing(true);
        setCash(existing.cashAmount > 0 ? String(existing.cashAmount) : "");
        setCard(existing.cardAmount > 0 ? String(existing.cardAmount) : "");
        setRefund(existing.refundAmount > 0 ? String(existing.refundAmount) : "");
        setNotes(existing.notes ?? "");
        setRows(
          existing.employeeSales.length > 0
            ? existing.employeeSales.map((es) => ({
                id: es.id,
                employeeId: es.employeeId,
                amount: String(es.amount),
              }))
            : [newRow()]
        );
      } else {
        setIsEditing(false);
        setCash("");
        setCard("");
        setRefund("");
        setNotes("");
        setRows([newRow()]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, centerId, date]);

  const employeesForCenter = employees;

  const sum = (Number(cash || 0) + Number(card || 0) - Number(refund || 0)).toFixed(2);
  const sumNum = Number(sum);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Add daily entry
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit daily entry" : "Add daily entry"}</DialogTitle>
        </DialogHeader>
        {isEditing && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            An entry already exists for this center on this date. Saving will overwrite it.
          </div>
        )}
        <form
          action={() =>
            startTransition(async () => {
              if (!centerId) {
                toast.error("Pick a center");
                return;
              }
              const res = await saveDailySale({
                centerId,
                date,
                cashAmount: Number(cash || 0),
                cardAmount: Number(card || 0),
                refundAmount: Number(refund || 0),
                notes: notes.trim() || null,
                employeeSales: rows
                  .filter((r) => r.employeeId && Number(r.amount || 0) > 0)
                  .map((r) => ({ employeeId: r.employeeId, amount: Number(r.amount) })),
              });
              if (res.ok) {
                toast.success("Saved");
                setOpen(false);
                reset();
              } else {
                toast.error(res.error ?? "Failed");
              }
            })
          }
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Center</Label>
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

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cash">Cash</Label>
              <Input id="cash" type="number" min="0" step="0.01" value={cash} onChange={(e) => setCash(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="card">Card</Label>
              <Input id="card" type="number" min="0" step="0.01" value={card} onChange={(e) => setCard(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="refund" className="text-red-600">Refund</Label>
              <Input
                id="refund"
                type="number"
                min="0"
                step="0.01"
                value={refund}
                onChange={(e) => setRefund(e.target.value)}
                placeholder="0.00"
                className="border-red-200 text-red-700 focus-visible:ring-red-300"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md bg-zinc-50 px-3 py-2 text-sm">
            <span className="text-zinc-500">Sum</span>
            <span className={"font-semibold " + (sumNum < 0 ? "text-red-600" : "")}>${sum}</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Salespeople</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setRows((r) => [...r, newRow()])}
                disabled={employeesForCenter.length === 0}
              >
                <Plus className="h-3 w-3" /> Add salesperson
              </Button>
            </div>
            {rows.map((row, i) => (
              <div key={row.id} className="grid grid-cols-[1fr_120px_auto] gap-2 items-center">
                <Select
                  value={row.employeeId}
                  onValueChange={(v) => setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, employeeId: v } : r)))}
                  disabled={employeesForCenter.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={employeesForCenter.length === 0 ? "No employees" : "Select salesperson"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {employeesForCenter.map((e) => (
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
                  placeholder="Amount"
                  value={row.amount}
                  onChange={(e) => setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, amount: e.target.value } : r)))}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setRows((rs) => (rs.length === 1 ? [newRow()] : rs.filter((r) => r.id !== row.id)))}
                  disabled={rows.length === 1 && !row.employeeId && !row.amount}
                  aria-label="Remove salesperson"
                >
                  <X className="h-4 w-4" />
                </Button>
                {/* unused index to silence linter */}
                <span className="hidden">{i}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything to flag?" />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEditing ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
