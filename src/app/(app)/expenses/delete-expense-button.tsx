"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteExpense } from "./actions";

export function DeleteExpenseButton({ id, title }: { id: string; title: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={pending}
      aria-label={`Delete ${title}`}
      onClick={() => {
        if (!confirm(`Delete "${title}"?`)) return;
        startTransition(async () => {
          const res = await deleteExpense(id);
          if (res.ok) toast.success("Deleted");
          else toast.error(res.error ?? "Failed");
        });
      }}
    >
      <Trash2 className="h-4 w-4 text-zinc-400 hover:text-red-600" />
    </Button>
  );
}
