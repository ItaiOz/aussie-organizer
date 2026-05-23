"use client";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function WeekPicker({ current, prev, next }: { current: string; prev: string; next: string }) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" asChild>
        <Link href={`/payroll?week=${prev}`}>
          <ChevronLeft className="h-4 w-4" />
        </Link>
      </Button>
      <Button variant="outline" asChild>
        <Link href="/payroll">This week</Link>
      </Button>
      <Button variant="outline" size="icon" asChild>
        <Link href={`/payroll?week=${next}`}>
          <ChevronRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
