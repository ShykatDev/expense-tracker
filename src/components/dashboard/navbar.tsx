"use client";

import * as React from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function startOfMonth(monthOffset: number) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
}

interface MonthNavContextValue {
  monthAnchor: Date;
  monthLabel: string;
  goToMonth: (offset: number) => void;
}

const MonthNavContext = React.createContext<MonthNavContextValue | null>(null);

/**
 * The month picker lives in the navbar, but the dashboard needs the selected
 * month to filter its data. Sharing it through a context keeps the navbar
 * chrome in the layout while the state stays reachable from the page.
 */
export function useMonthNav() {
  const context = React.useContext(MonthNavContext);
  if (!context) {
    throw new Error("useMonthNav must be used within a MonthNavProvider");
  }
  return context;
}

export function MonthNavProvider({ children }: { children: React.ReactNode }) {
  const [monthOffset, setMonthOffset] = React.useState(0);

  const monthAnchor = React.useMemo(() => startOfMonth(monthOffset), [monthOffset]);
  const monthLabel = React.useMemo(
    () =>
      monthAnchor.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
    [monthAnchor],
  );

  const value = React.useMemo(
    () => ({
      monthAnchor,
      monthLabel,
      goToMonth: (offset: number) => setMonthOffset(offset),
    }),
    [monthAnchor, monthLabel],
  );

  return (
    <MonthNavContext.Provider value={value}>{children}</MonthNavContext.Provider>
  );
}

/**
 * The month is shown as a pill that opens a compact calendar: a year switcher
 * over a 3×4 grid of months. Any past month is one tap away, future months
 * are disabled, and "This month" jumps straight back.
 */
export function MonthPicker({ className }: { className?: string }) {
  const monthNav = React.useContext(MonthNavContext);
  const [open, setOpen] = React.useState(false);

  const now = React.useMemo(() => new Date(), []);
  const selectedYear = monthNav?.monthAnchor.getFullYear() ?? now.getFullYear();
  const selectedMonth = monthNav?.monthAnchor.getMonth() ?? now.getMonth();

  // The year being browsed; it resets to the selected year each time the
  // calendar opens.
  const [viewYear, setViewYear] = React.useState(selectedYear);

  if (!monthNav) return null;

  function pick(month: number) {
    const offset =
      (viewYear - now.getFullYear()) * 12 + (month - now.getMonth());
    monthNav!.goToMonth(offset);
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setViewYear(selectedYear);
        setOpen(next);
      }}
    >
      <PopoverTrigger
        className={cn(
          "flex h-8 min-w-28 items-center justify-center gap-1.5 rounded-full bg-white/10 px-3 text-sm font-medium tabular-nums transition-colors hover:bg-white/15",
          className,
        )}
        aria-label="Choose month"
      >
        <CalendarDays className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate">{monthNav.monthLabel}</span>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-72 p-4">
        {/* Year switcher */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setViewYear((year) => year - 1)}
            aria-label="Previous year"
            className="flex size-9 items-center justify-center rounded-full bg-white/6 text-white/70 transition-colors hover:bg-white/12 hover:text-white"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-base font-semibold tabular-nums text-white">
            {viewYear}
          </span>
          <button
            type="button"
            onClick={() => setViewYear((year) => year + 1)}
            disabled={viewYear >= now.getFullYear()}
            aria-label="Next year"
            className="flex size-9 items-center justify-center rounded-full bg-white/6 text-white/70 transition-colors hover:bg-white/12 hover:text-white disabled:pointer-events-none disabled:opacity-25"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        {/* Months */}
        <div className="mt-4 grid grid-cols-3 gap-1.5">
          {MONTH_NAMES.map((name, month) => {
            const isSelected = viewYear === selectedYear && month === selectedMonth;
            const isCurrent = viewYear === now.getFullYear() && month === now.getMonth();
            const isFuture =
              viewYear > now.getFullYear() ||
              (viewYear === now.getFullYear() && month > now.getMonth());

            return (
              <button
                key={name}
                type="button"
                onClick={() => pick(month)}
                disabled={isFuture}
                aria-pressed={isSelected}
                aria-label={`${name} ${viewYear}`}
                className={cn(
                  "relative flex h-11 items-center justify-center rounded-2xl text-sm transition-colors disabled:pointer-events-none disabled:text-white/20",
                  isSelected
                    ? "bg-white font-semibold text-black"
                    : "text-white/75 hover:bg-white/8 hover:text-white",
                )}
              >
                {name.slice(0, 3)}
                {isCurrent && !isSelected && (
                  <span className="absolute bottom-1.5 size-1 rounded-full bg-white/60" />
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => {
            monthNav.goToMonth(0);
            setOpen(false);
          }}
          className="mt-3 h-10 w-full rounded-full bg-white/6 text-xs text-white/70 transition-colors hover:bg-white/12 hover:text-white"
        >
          This month
        </button>
      </PopoverContent>
    </Popover>
  );
}

const MONTH_NAMES = Array.from({ length: 12 }, (_, month) =>
  new Date(2000, month, 1).toLocaleDateString("en-US", { month: "long" }),
);
