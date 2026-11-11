"use client";

import { Check, ChevronDown } from "lucide-react";
import * as React from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { resolveCategoryIcon } from "@/lib/categories";
import {
  computeCategoryTotals,
  type CustomCategory,
  formatCompactNumber,
  formatCurrency,
  type Transaction,
} from "@/lib/transactions";
import { cn } from "@/lib/utils";

export type AnalyticsRange = "daily" | "weekly" | "monthly";

const RANGE_OPTIONS: { value: AnalyticsRange; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

interface Bucket {
  key: string;
  label: string;
  /** Epoch ms, inclusive. */
  start: number;
  /** Epoch ms, exclusive. */
  end: number;
  total: number;
}

const DAY_MS = 86_400_000;

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function shortDate(date: Date) {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/**
 * Builds the chart buckets for the chosen range, ending at the selected
 * month's "now": today for the current month, otherwise its last day.
 *
 * Daily shows seven days, weekly six seven-day windows and monthly six
 * months, so the pill bars stay wide enough to read on a phone.
 */
function buildBuckets(
  range: AnalyticsRange,
  monthAnchor: Date,
  transactions: Transaction[],
): Bucket[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthEnd = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 0);
  const endDay = monthEnd < today ? monthEnd : today;

  let buckets: Bucket[];

  if (range === "daily") {
    buckets = Array.from({ length: 7 }, (_, index) => {
      const start = addDays(endDay, index - 6);
      return {
        key: `d-${start.getTime()}`,
        label: shortDate(start),
        start: start.getTime(),
        end: addDays(start, 1).getTime(),
        total: 0,
      };
    });
  } else if (range === "weekly") {
    buckets = Array.from({ length: 6 }, (_, index) => {
      const start = addDays(endDay, (index - 5) * 7 - 6);
      return {
        key: `w-${start.getTime()}`,
        label: shortDate(start),
        start: start.getTime(),
        end: addDays(start, 7).getTime(),
        total: 0,
      };
    });
  } else {
    buckets = Array.from({ length: 6 }, (_, index) => {
      const start = new Date(
        monthAnchor.getFullYear(),
        monthAnchor.getMonth() - (5 - index),
        1,
      );
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      return {
        key: `m-${start.getTime()}`,
        label: start.toLocaleDateString("en-US", { month: "short" }),
        start: start.getTime(),
        end: end.getTime(),
        total: 0,
      };
    });
  }

  for (const transaction of transactions) {
    if (transaction.type !== "expense") continue;
    const bucket = buckets.find(
      (b) => transaction.createdAt >= b.start && transaction.createdAt < b.end,
    );
    if (bucket) bucket.total += transaction.amount;
  }

  return buckets;
}

/** Rounds a step up to 1, 2, 2.5 or 5 × a power of ten, for tidy axis labels. */
function niceStep(raw: number) {
  if (raw <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(raw));
  const fraction = raw / power;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return nice * power;
}

/**
 * The "All Categories" spending chart: rounded pill bars with the selected
 * one highlighted in pale blue and labelled, plus a dashed average line.
 */
export function SpendingAnalytics({
  transactions,
  monthAnchor,
}: {
  /** Every transaction — a daily or weekly window can cross a month edge. */
  transactions: Transaction[];
  monthAnchor: Date;
}) {
  const [range, setRange] = React.useState<AnalyticsRange>("daily");
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null);

  const buckets = React.useMemo(
    () => buildBuckets(range, monthAnchor, transactions),
    [range, monthAnchor, transactions],
  );

  // The highlight defaults to the most recent bucket with spending, and
  // falls back to that whenever the user's pick is no longer on screen.
  const activeKey = React.useMemo(() => {
    if (selectedKey && buckets.some((b) => b.key === selectedKey)) return selectedKey;
    for (let index = buckets.length - 1; index >= 0; index -= 1) {
      if (buckets[index].total > 0) return buckets[index].key;
    }
    return buckets[buckets.length - 1]?.key ?? null;
  }, [buckets, selectedKey]);

  const max = Math.max(...buckets.map((b) => b.total), 0);
  const step = niceStep(max / 3);
  const top = step * 3;
  const ticks = [3, 2, 1, 0].map((n) => n * step);
  const average = buckets.reduce((sum, b) => sum + b.total, 0) / buckets.length;
  const hasData = max > 0;

  const first = buckets[0];
  const last = buckets[buckets.length - 1];
  const rangeLabel =
    range === "monthly"
      ? `${new Date(first.start).toLocaleDateString("en-US", { month: "short", year: "numeric" })} - ${new Date(last.start).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`
      : `${shortDate(new Date(first.start))} - ${shortDate(new Date(last.end - DAY_MS))}`;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">All Categories</h2>
          <p className="mt-0.5 text-xs text-white/50 lowercase">{rangeLabel}</p>
        </div>
        <RangeSelect value={range} onChange={setRange} />
      </div>

      <div className="relative mt-3 flex h-60 gap-2">
        {/* Y axis */}
        <div className="relative h-52 w-8 shrink-0" aria-hidden="true">
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute left-0 -translate-y-1/2 text-[10px] tabular-nums text-white/35"
              style={{ bottom: `${(tick / top) * 100}%` }}
            >
              {formatCompactNumber(tick)}
            </span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          {/* Average line */}
          {hasData && (
            <div
              aria-hidden="true"
              className="absolute inset-x-0 border-t border-dashed border-white/25 transition-[bottom] duration-500"
              style={{ bottom: `calc(2rem + ${(average / top) * 13}rem)` }}
            />
          )}

          <div
            className="grid h-full"
            style={{ gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))` }}
          >
            {buckets.map((bucket) => {
              const isActive = bucket.key === activeKey;
              const ratio = top > 0 ? bucket.total / top : 0;

              return (
                <button
                  key={bucket.key}
                  type="button"
                  onClick={() => setSelectedKey(bucket.key)}
                  aria-pressed={isActive}
                  aria-label={`${bucket.label}: ${formatCurrency(bucket.total)}`}
                  className="group flex flex-col items-center outline-none"
                >
                  <div className="flex h-52 w-full flex-col items-center justify-end">
                    {isActive && bucket.total > 0 && (
                      <span className="mb-1.5 text-[11px] font-medium tabular-nums text-white animate-in fade-in duration-300">
                        ৳{formatCompactNumber(Math.round(bucket.total))}
                      </span>
                    )}
                    {bucket.total > 0 ? (
                      <span
                        className={cn(
                          "block w-7 max-w-[80%] rounded-full transition-[height,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-focus-visible:ring-2 group-focus-visible:ring-white/40",
                          isActive
                            ? "accent-gradient"
                            : "bg-linear-to-b from-[#3a3b40] to-[#1c1d20] group-hover:from-[#46474d]",
                        )}
                        style={{ height: `max(1.75rem, ${ratio * 100}%)` }}
                      />
                    ) : (
                      <span className="block size-2 rounded-full bg-white/10" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "mt-3 truncate text-[10px] transition-colors",
                      isActive ? "font-medium text-white" : "text-white/35",
                    )}
                  >
                    {bucket.label}
                  </span>
                </button>
              );
            })}
          </div>

          {!hasData && (
            <p className="pointer-events-none absolute inset-x-0 top-20 text-center text-xs text-white/40">
              No spending in this period yet
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function RangeSelect({
  value,
  onChange,
}: {
  value: AnalyticsRange;
  onChange: (value: AnalyticsRange) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const current = RANGE_OPTIONS.find((option) => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-4 text-xs text-white/80 transition-colors hover:bg-white/15"
        aria-label="Chart range"
      >
        {current?.label}
        <ChevronDown className="size-3.5 text-white/60" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-36">
        <div className="flex flex-col gap-0.5">
          {RANGE_OPTIONS.map((option) => (
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

/**
 * The "Spent Category" list under the chart: one row per expense category for
 * the selected month, largest first, each with its share of the month's
 * spending drawn as a thin bar. The biggest category gets the accent colour.
 */
export function SpentCategories({
  transactions,
  customCategories = [],
}: {
  transactions: Transaction[];
  customCategories?: CustomCategory[];
}) {
  const rows = React.useMemo(
    () => computeCategoryTotals(transactions).filter((entry) => entry.type === "expense"),
    [transactions],
  );
  const total = rows.reduce((sum, row) => sum + row.total, 0);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-0.5">
        <h2 className="text-xs font-medium text-white/45">Spent Category</h2>
        {total > 0 && (
          <p className="text-xs tabular-nums text-white/30">
            {formatCurrency(total)} across {rows.length}{" "}
            {rows.length === 1 ? "category" : "categories"}
          </p>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-3xl bg-white/6 px-5 py-6 text-center text-sm text-white/40">
          Nothing spent this month yet
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row, index) => {
            const share = total > 0 ? row.total / total : 0;
            const Icon = resolveCategoryIcon("expense", row.category, customCategories);
            const isTop = index === 0;
            return (
              <li
                key={row.category}
                className="flex items-center gap-3 rounded-3xl bg-white/6 py-3 pr-5 pl-3"
              >
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full",
                    "bg-white/8", isTop ? "text-[#6f97e6]" : "text-white",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm text-white/85">{row.category}</span>
                    <span className="shrink-0 text-sm font-medium tabular-nums text-white">
                      {formatCurrency(row.total)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/8">
                      <div
                        className={cn(
                          "h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
                          isTop ? "accent-gradient-x" : "bg-white/25",
                        )}
                        style={{ width: `${Math.max(share * 100, 2)}%` }}
                      />
                    </div>
                    <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-white/40">
                      {Math.round(share * 100)}%
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
