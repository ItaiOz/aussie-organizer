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
import { cn } from "@/lib/utils";
import { createSale } from "./actions";

type Center = { id: string; name: string };
type Emp = { id: string; fullName: string; centerId: string | null };

export function SaleFormDialog({ centers, employees }: { centers: Center[]; employees: Emp[] }) {
  const [open, setOpen] = useState(false);
  const [centerId, setCenterId] = useState<string>("");
  const [employeeId, setEmployeeId] = useState<string>("");
  const [type, setType] = useState<"sale" | "refund">("sale");
  const [cash, setCash] = useState("");
  const [credit, setCredit] = useState("");
  const [pending, startTransition] = useTransition();
  const today = format(new Date(), "yyyy-MM-dd");
  const total = (Number(cash || 0) + Number(credit || 0)).toFixed(2);
  const employeesForCenter = centerId
    ? employees.filter((e) => e.centerId === centerId)
    : employees;

  const reset = () => {
    setCenterId("");
    setEmployeeId("");
    setType("sale");
    setCash("");
    setCredit("");
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
        <Button>
          <Plus className="h-4 w-4" /> Record sale
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record {type === "refund" ? "refund" : "sale"}</DialogTitle>
        </DialogHeader>
        <form
          action={(fd) =>
            startTransition(async () => {
              if (centerId) fd.set("centerId", centerId);
              if (employeeId) fd.set("employeeId", employeeId);
              fd.set("type", type);
              const res = await createSale(fd);
              if (res.ok) {
                toast.success(type === "refund" ? "Refund recorded" : "Sale recorded");
                setOpen(false);
                reset();
              } else {
                toast.error(res.error ?? "Failed");
              }
            })
          }
          className="space-y-4"
        >
          <div className="flex rounded-md bg-zinc-100 p-1">
            <button
              type="button"
              onClick={() => setType("sale")}
              className={cn(
                "flex-1 rounded text-sm font-medium py-1.5 transition-colors",
                type === "sale" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"
              )}
            >
              Sale
            </button>
            <button
              type="button"
              onClick={() => setType("refund")}
              className={cn(
                "flex-1 rounded text-sm font-medium py-1.5 transition-colors",
                type === "refund" ? "bg-white text-red-700 shadow-sm" : "text-zinc-500"
              )}
            >
              Refund
            </button>
          </div>

          <div className="space-y-2">
            <Label>Center</Label>
            <Select
              value={centerId}
              onValueChange={(v) => {
                setCenterId(v);
                setEmployeeId("");
              }}
            >
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
            <Label>Salesperson (optional)</Label>
            <Select value={employeeId} onValueChange={setEmployeeId} disabled={!centerId || employeesForCenter.length === 0}>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !centerId
                      ? "Pick a center first"
                      : employeesForCenter.length === 0
                      ? "No employees at this center"
                      : "Select salesperson"
                  }
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" name="date" type="date" defaultValue={today} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cashAmount">Cash (AUD)</Label>
              <Input
                id="cashAmount"
                name="cashAmount"
                type="number"
                min="0"
                step="0.01"
                value={cash}
                onChange={(e) => setCash(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="creditAmount">Credit (AUD)</Label>
              <Input
                id="creditAmount"
                name="creditAmount"
                type="number"
                min="0"
                step="0.01"
                value={credit}
                onChange={(e) => setCredit(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <div className={cn(
            "flex items-center justify-between rounded-md px-3 py-2 text-sm",
            type === "refund" ? "bg-red-50 text-red-700" : "bg-zinc-50"
          )}>
            <span className="text-zinc-500">{type === "refund" ? "Refund total" : "Total"}</span>
            <span className="font-semibold">{type === "refund" ? "−" : ""}${total}</span>
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
