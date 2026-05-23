"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
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
  DialogClose,
} from "@/components/ui/dialog";
import { createCenter, updateCenter, deleteCenter } from "./actions";

export const REGIONS = ["Queensland", "New South Wales", "South Australia"] as const;
export type Region = (typeof REGIONS)[number];

export type CenterInitial = {
  id: string;
  name: string;
  status: string;
  region: string | null;
  contactName: string | null;
  bookedFrom: string | null;
  bookedTo: string | null;
  notes: string | null;
};

export function CenterDialog({
  open,
  onOpenChange,
  initial,
  defaultStatus = "need_to_contact",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: CenterInitial | null;
  defaultStatus?: string;
}) {
  const editing = !!initial;
  const [status, setStatus] = useState(initial?.status ?? defaultStatus);
  const [region, setRegion] = useState<string>(
    initial?.region && (REGIONS as readonly string[]).includes(initial.region) ? initial.region : ""
  );
  const [pending, startTransition] = useTransition();
  const [deleting, startDelete] = useTransition();

  const fmtDateInput = (s: string | null | undefined) => (s ? format(new Date(s), "yyyy-MM-dd") : "");

  // Re-sync status when initial changes (dialog opened on a different card)
  if (initial && open && initial.status !== status && !pending) {
    // The check on `!pending` avoids overwriting a user-selected status while saving.
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setStatus(initial?.status ?? defaultStatus);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit center" : "New shopping center"}</DialogTitle>
        </DialogHeader>
        <form
          key={initial?.id ?? "new"}
          action={(fd) =>
            startTransition(async () => {
              fd.set("status", status);
              fd.set("region", region);
              const res = editing
                ? await updateCenter(initial!.id, fd)
                : await createCenter(fd);
              if (res.ok) {
                toast.success(editing ? "Saved" : "Center added");
                onOpenChange(false);
              } else {
                toast.error(res.error ?? "Failed");
              }
            })
          }
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required autoFocus defaultValue={initial?.name ?? ""} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Region</Label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger>
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  {REGIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactName">Contact name</Label>
              <Input
                id="contactName"
                name="contactName"
                placeholder="Leasing manager"
                defaultValue={initial?.contactName ?? ""}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="need_to_contact">Need to contact</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="booked">Booked</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="bookedFrom">Booked from</Label>
              <Input
                id="bookedFrom"
                name="bookedFrom"
                type="date"
                defaultValue={fmtDateInput(initial?.bookedFrom)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bookedTo">Booked to</Label>
              <Input
                id="bookedTo"
                name="bookedTo"
                type="date"
                defaultValue={fmtDateInput(initial?.bookedTo)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              name="notes"
              placeholder="e.g. visit during weekday lunch"
              defaultValue={initial?.notes ?? ""}
            />
          </div>
          <DialogFooter className="!justify-between">
            <div>
              {editing && (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  disabled={deleting}
                  onClick={() => {
                    if (!confirm(`Delete "${initial!.name}"? Any sales recorded at this center will also be deleted, and employees assigned to it will be unassigned. This can't be undone.`)) return;
                    startDelete(async () => {
                      try {
                        await deleteCenter(initial!.id);
                        toast.success("Deleted");
                        onOpenChange(false);
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Failed to delete");
                      }
                    });
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={pending || deleting}>
                {pending ? "Saving…" : editing ? "Save changes" : "Save"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function NewCenterButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> New center
      </Button>
      <CenterDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
