"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
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
import { assignEmployee } from "./actions";

export function AssignButton({ apartmentId, employees }: { apartmentId: string; employees: { id: string; fullName: string }[] }) {
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [pending, startTransition] = useTransition();
  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Add occupant
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign employee to apartment</DialogTitle>
        </DialogHeader>
        <form
          action={(fd) =>
            startTransition(async () => {
              fd.set("apartmentId", apartmentId);
              if (employeeId) fd.set("employeeId", employeeId);
              const res = await assignEmployee(fd);
              if (res.ok) {
                toast.success("Assigned");
                setOpen(false);
                setEmployeeId("");
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
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="moveInDate">Move-in date</Label>
            <Input id="moveInDate" name="moveInDate" type="date" defaultValue={today} required />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Assign"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
