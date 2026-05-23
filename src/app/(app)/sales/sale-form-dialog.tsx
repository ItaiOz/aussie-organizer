"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
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
import { createSale } from "./actions";

type Emp = { id: string; fullName: string; centerId: string | null; centerName: string | null };

export function SaleFormDialog({ employees }: { employees: Emp[] }) {
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState<string>("");
  const [cash, setCash] = useState<string>("");
  const [credit, setCredit] = useState<string>("");
  const [pending, startTransition] = useTransition();
  const today = format(new Date(), "yyyy-MM-dd");
  const total = (Number(cash || 0) + Number(credit || 0)).toFixed(2);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Record sale
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record daily sale</DialogTitle>
        </DialogHeader>
        <form
          action={(fd) =>
            startTransition(async () => {
              if (employeeId) fd.set("employeeId", employeeId);
              const res = await createSale(fd);
              if (res.ok) {
                toast.success("Sale recorded");
                setOpen(false);
                setEmployeeId("");
                setCash("");
                setCredit("");
              } else {
                toast.error(res.error ?? "Failed");
              }
            })
          }
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label>Employee</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.fullName}
                    {e.centerName ? ` — ${e.centerName}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" name="date" type="date" defaultValue={today} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cashAmount">Cash (AUD)</Label>
              <Input id="cashAmount" name="cashAmount" type="number" min="0" step="0.01" value={cash} onChange={(e) => setCash(e.target.value)} placeholder="0.00" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="creditAmount">Credit (AUD)</Label>
              <Input id="creditAmount" name="creditAmount" type="number" min="0" step="0.01" value={credit} onChange={(e) => setCredit(e.target.value)} placeholder="0.00" required />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md bg-zinc-50 px-3 py-2 text-sm">
            <span className="text-zinc-500">Total</span>
            <span className="font-semibold">${total}</span>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input id="notes" name="notes" placeholder="Anything to flag?" />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
