"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { generateDrafts } from "./actions";

export function GenerateButton({ weekStart }: { weekStart: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      onClick={() =>
        startTransition(async () => {
          const res = await generateDrafts(weekStart);
          toast.success(`Generated ${res.created} draft row(s)`);
        })
      }
      disabled={pending}
    >
      <Sparkles className="h-4 w-4" />
      {pending ? "Generating…" : "Generate drafts"}
    </Button>
  );
}
