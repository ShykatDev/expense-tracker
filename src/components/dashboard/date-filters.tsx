"use client";

import { Check, ListFilter } from "lucide-react";
import * as React from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { DateRangeFilter } from "@/lib/transactions";
import { cn } from "@/lib/utils";

const OPTIONS: { value: DateRangeFilter; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "all", label: "All Time" },
];

export function DateFilters({
  value,
  onChange,
}: {
  value: DateRangeFilter;
  onChange: (value: DateRangeFilter) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const current = OPTIONS.find((option) => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="glass flex w-fit items-center rounded-full border border-white/10 p-1 text-xs font-medium transition-all animate-in fade-in slide-in-from-bottom-2 duration-500">
        <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-1.5 text-foreground shadow-[0_1px_0_0_rgba(255,255,255,0.1)_inset]">
          <ListFilter className="size-3.5" />
          {current?.label}
        </span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44">
        <div className="flex flex-col gap-0.5">
          {OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={cn(
                "flex items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors",
                value === option.value
                  ? "bg-white/15 text-foreground"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
              )}
            >
              {option.label}
              {value === option.value && <Check className="size-3.5" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
