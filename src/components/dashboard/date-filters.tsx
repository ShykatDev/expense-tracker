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
  compact = false,
}: {
  value: DateRangeFilter;
  onChange: (value: DateRangeFilter) => void;
  /** Drops the icon and padding so it fits beside another control. */
  compact?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const current = OPTIONS.find((option) => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "flex h-9 w-fit shrink-0 items-center gap-1.5 rounded-full bg-white/10 text-xs whitespace-nowrap text-white/80 transition-colors hover:bg-white/15",
          compact ? "px-3" : "px-4",
        )}
      >
        <ListFilter className={cn("size-3.5", compact && "hidden min-[400px]:block")} />
        {current?.label}
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
                "flex h-9 items-center justify-between rounded-2xl px-3 text-left text-xs font-medium transition-colors",
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
