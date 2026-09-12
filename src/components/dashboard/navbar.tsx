"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export function Navbar({
  monthLabel,
  onPrevMonth,
  onNextMonth,
}: {
  monthLabel: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}) {
  return (
    <div className="glass backdrop-blur-2xl sticky top-4 z-20 flex items-center justify-center rounded-2xl border border-white/10 px-3 py-1 shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset,0_8px_30px_-12px_rgba(0,0,0,0.6)] animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={onPrevMonth}
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="min-w-28 text-center text-sm font-medium tabular-nums">
          {monthLabel}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={onNextMonth}
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
