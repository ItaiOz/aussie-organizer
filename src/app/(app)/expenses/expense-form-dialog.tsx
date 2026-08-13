"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
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
import { createExpense, updateExpense } from "./actions";
import { EXPENSE_CATEGORIES, EXPENSE_PAID_BY } from "./categories";

export type EditableExpense = {
  id: string;
  title: string;
  amount: number;
  category: string;
  paidBy: string;
  datePaid: string; // yyyy-MM-dd
  notes: string | null;
};

export function ExpenseFormDialog({ expense }: { expense?: EditableExpense }) {
  const isEditing = !!expense;
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(expense?.title ?? "");
  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [category, setCategory] = useState(expense?.category ?? "");
  const [paidBy, setPaidBy] = useState(expense?.paidBy ?? "");
  const [datePaid, setDatePaid] = useState(expense?.datePaid ?? format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState(expense?.notes ?? "");
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setTitle(expense?.title ?? "");
    setAmount(expense ? String(expense.amount) : "");
    setCategory(expense?.category ?? "");
    setPaidBy(expense?.paidBy ?? "");
    setDatePaid(expense?.datePaid ?? format(new Date(), "yyyy-MM-dd"));
    setNotes(expense?.notes ?? "");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        {isEditing ? (
          <Button variant="ghost" size="icon" aria-label={`Edit ${expense.title}`}>
            <Pencil className="h-4 w-4 text-zinc-400 hover:text-zinc-900" />
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4" /> Add expense
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit expense" : "Add expense"}</DialogTitle>
        </DialogHeader>
        <form
          action={() =>
            startTransition(async () => {
              const input = {
                title,
                amount: Number(amount || 0),
                category,
                paidBy,
                datePaid,
                notes: notes.trim() || null,
              };
              const res = isEditing ? await updateExpense(expense.id, input) : await createExpense(input);
              if (res.ok) {
                toast.success("Saved");
                setOpen(false);
                if (!isEditing) reset();
              } else {
                toast.error(res.error ?? "Failed");
              }
            })
          }
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. May rent — Westfield Parramatta"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (AUD)</Label>
              <Input
                id="amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="datePaid">Date paid</Label>
              <Input id="datePaid" type="date" value={datePaid} onChange={(e) => setDatePaid(e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Paid by</Label>
              <Select value={paidBy} onValueChange={setPaidBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Who paid?" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_PAID_BY.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
