"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import * as React from "react";

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
  /** A second, quieter label line (the weekday, for the daily view). */
  sub?: string;
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
        label: `${start.getDate()}`,
        sub: start.toLocaleDateString("en-US", { weekday: "short" }),
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

const PERIOD_NOUN: Record<AnalyticsRange, string> = {
  daily: "7 days",
  weekly: "6 weeks",
  monthly: "6 months",
};

const UNIT: Record<AnalyticsRange, { average: string; active: string }> = {
  daily: { average: "Avg / day", active: "Active days" },
  weekly: { average: "Avg / week", active: "Active weeks" },
  monthly: { average: "Avg / month", active: "Active months" },
};

/** Total spent in the window of the same length just before `buckets`. */
function previousWindowTotal(
  range: AnalyticsRange,
  buckets: Bucket[],
  transactions: Transaction[],
) {
  const first = new Date(buckets[0].start);
  const end = buckets[0].start;
  const start =
    range === "monthly"
      ? new Date(first.getFullYear(), first.getMonth() - buckets.length, 1).getTime()
      : end - (buckets[buckets.length - 1].end - end);

  let total = 0;
  for (const t of transactions) {
    if (t.type === "expense" && t.createdAt >= start && t.createdAt < end) total += t.amount;
  }
  return total;
}

/**
 * A smooth path through the points using monotone cubic interpolation
 * (Fritsch–Carlson), so the curve never overshoots below zero or above a
 * peak the way a plain spline would.
 */
function monotonePath(points: { x: number; y: number }[]) {
  const n = points.length;
  if (n === 0) return "";
  if (n === 1) return `M${points[0].x},${points[0].y}`;

  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    dx.push(points[i + 1].x - points[i].x);
    slope.push((points[i + 1].y - points[i].y) / dx[i]);
  }

  const tangent: number[] = [slope[0]];
  for (let i = 1; i < n - 1; i += 1) {
    tangent.push(slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2);
  }
  tangent.push(slope[n - 2]);

  for (let i = 0; i < n - 1; i += 1) {
    if (slope[i] === 0) {
      tangent[i] = 0;
      tangent[i + 1] = 0;
      continue;
    }
    const a = tangent[i] / slope[i];
    const b = tangent[i + 1] / slope[i];
    const h = a * a + b * b;
    if (h > 9) {
      const t = 3 / Math.sqrt(h);
      tangent[i] = t * a * slope[i];
      tangent[i + 1] = t * b * slope[i];
    }
  }

  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < n - 1; i += 1) {
    const third = dx[i] / 3;
    d += ` C${points[i].x + third},${points[i].y + tangent[i] * third} ${points[i + 1].x - third},${points[i + 1].y - tangent[i + 1] * third} ${points[i + 1].x},${points[i + 1].y}`;
  }
  return d;
}

/** Plot height as a share of the chart box; the rest is breathing room. */
const PLOT = 0.8;
const BASELINE = 0.08;

/**
 * The spending chart. By default it is deliberately minimal — the period's
 * total, a smooth line with a soft fill, a quiet label on the selected point
 * and the period labels. With `detailed` (the expanded dashboard sheet) it
 * adds the comparison with the previous period, the average line and a
 * summary of average, peak and active periods.
 */
export function SpendingAnalytics({
  transactions,
  monthAnchor,
  detailed = false,
}: {
  /** Every transaction — a daily or weekly window can cross a month edge. */
  transactions: Transaction[];
  monthAnchor: Date;
  detailed?: boolean;
}) {
  const [range, setRange] = React.useState<AnalyticsRange>("daily");
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null);
  const gradientId = React.useId().replace(/:/g, "");

  const buckets = React.useMemo(
    () => buildBuckets(range, monthAnchor, transactions),
    [range, monthAnchor, transactions],
  );

  const previousTotal = React.useMemo(
    () => previousWindowTotal(range, buckets, transactions),
    [range, buckets, transactions],
  );

  // The highlight defaults to the most recent bucket with spending, and
  // falls back to that whenever the user's pick is no longer on screen.
  const activeIndex = React.useMemo(() => {
    const picked = buckets.findIndex((b) => b.key === selectedKey);
    if (picked !== -1) return picked;
    for (let index = buckets.length - 1; index >= 0; index -= 1) {
      if (buckets[index].total > 0) return index;
    }
    return buckets.length - 1;
  }, [buckets, selectedKey]);

  const n = buckets.length;
  const total = buckets.reduce((sum, b) => sum + b.total, 0);
  const max = Math.max(...buckets.map((b) => b.total), 0);
  const average = total / n;
  const peak = buckets.reduce((best, b) => (b.total > best.total ? b : best), buckets[0]);
  const activeCount = buckets.filter((b) => b.total > 0).length;
  const hasData = max > 0;
  const top = max * 1.05 || 1;

  /** Value → vertical position, 0 (top) to 1 (bottom) of the chart box. */
  const yOf = (value: number) => 1 - BASELINE - (value / top) * PLOT;
  /** Bucket index → horizontal centre, 0 to 1. */
  const xOf = (index: number) => (index + 0.5) / n;

  // The SVG is stretched to the box (preserveAspectRatio="none"), so it is
  // drawn in a 100 × 100 space; strokes stay crisp via non-scaling-stroke.
  const points = buckets.map((b, i) => ({ x: xOf(i) * 100, y: yOf(b.total) * 100 }));
  // Run the curve off both edges, flat.
  const edged = points.length
    ? [{ x: 0, y: points[0].y }, ...points, { x: 100, y: points[points.length - 1].y }]
    : points;
  const linePath = monotonePath(edged);
  const areaPath = linePath ? `${linePath} L100,100 L0,100 Z` : "";

  const active = buckets[activeIndex];
  const activeVsAverage =
    active && average > 0 && active.total > 0
      ? Math.round(((active.total - average) / average) * 100)
      : null;

  const change =
    previousTotal > 0 ? Math.round(((total - previousTotal) / previousTotal) * 100) : null;

  const first = buckets[0];
  const last = buckets[n - 1];
  const rangeLabel =
    range === "monthly"
      ? `${new Date(first.start).toLocaleDateString("en-US", { month: "short" })} – ${new Date(last.start).toLocaleDateString("en-US", { month: "short" })}`
      : `${shortDate(new Date(first.start))} – ${shortDate(new Date(last.end - DAY_MS))}`;

  const bucketName = (b: Bucket) => (b.sub ? `${b.sub} ${b.label}` : b.label);
  const labelAlign = activeIndex === 0 ? "left" : activeIndex === n - 1 ? "right" : "center";

  return (
    <section className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-white/40">Spending · {rangeLabel}</p>
          <p className="mt-1 text-[1.6rem] leading-none font-semibold tracking-tight tabular-nums text-white/90">
            {formatCurrency(total)}
          </p>
        </div>
        <RangeTabs value={range} onChange={setRange} />
      </div>

      {/* Chart */}
      <div className="pt-6">
        <div className="relative h-32">
          {detailed && hasData && (
            <div
              aria-hidden="true"
              className="absolute inset-x-0 border-t border-dashed border-white/10 transition-[top] duration-500 animate-in fade-in"
              style={{ top: `${yOf(average) * 100}%` }}
            >
              <span className="absolute bottom-1 left-0 text-[10px] tabular-nums text-white/30">
                avg {formatCompactNumber(Math.round(average))}
              </span>
            </div>
          )}

          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
            className="absolute inset-0 size-full overflow-visible"
          >
            <defs>
              <linearGradient id={`${gradientId}-area`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#ffffff" stopOpacity="0.08" />
                <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
              </linearGradient>
            </defs>
            {hasData && <path d={areaPath} fill={`url(#${gradientId}-area)`} />}
            <path
              d={linePath}
              fill="none"
              stroke="rgba(255,255,255,0.5)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {/* Selected point */}
          {active && hasData && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 transition-[left] duration-300 ease-out"
              style={{ left: `${xOf(activeIndex) * 100}%` }}
            >
              <div
                className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0d0e11] ring-2 ring-white/60 transition-[top] duration-300"
                style={{ top: `${yOf(active.total) * 100}%` }}
              />
              <p
                className={cn(
                  "absolute -translate-y-full text-right text-[11px] whitespace-nowrap transition-[top] duration-300",
                  labelAlign === "left" ? "left-0" : labelAlign === "right" ? "right-0" : "-translate-x-1/2",
                )}
                style={{ top: `calc(${yOf(active.total) * 100}% - 0.6rem)` }}
              >
                <span className="font-medium tabular-nums text-white/80">
                  {active.total > 0 ? formatCurrency(active.total) : "No spending"}
                </span>
                {detailed && activeVsAverage !== null && (
                  <span className="text-white/35">
                    {" · "}
                    {Math.abs(activeVsAverage) < 5
                      ? "about avg"
                      : `${Math.abs(activeVsAverage)}% ${activeVsAverage > 0 ? "above" : "below"} avg`}
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Tap targets */}
          <div
            className="absolute inset-0 grid"
            style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
          >
            {buckets.map((bucket, index) => (
              <button
                key={bucket.key}
                type="button"
                onClick={() => setSelectedKey(bucket.key)}
                aria-pressed={index === activeIndex}
                aria-label={`${bucketName(bucket)}: ${formatCurrency(bucket.total)}`}
                className="rounded-xl outline-none focus-visible:bg-white/4"
              />
            ))}
          </div>

          {!hasData && (
            <p className="pointer-events-none absolute inset-x-0 top-1/3 text-center text-xs text-white/30">
              No spending in this period yet
            </p>
          )}
        </div>

        {/* Period labels */}
        <div
          className="mt-2.5 grid"
          style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
          aria-hidden="true"
        >
          {buckets.map((bucket, index) => (
            <span
              key={bucket.key}
              className={cn(
                "truncate text-center text-[11px] lowercase transition-colors",
                index === activeIndex ? "font-semibold text-white/85" : "text-white/30",
              )}
            >
              {bucket.sub ?? bucket.label}
            </span>
          ))}
        </div>
      </div>

      {/* Details, only in the expanded sheet */}
      {detailed && (
        <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-1 duration-500">
          <p className="text-xs leading-snug text-white/40">
            {change === null ? (
              `No data for the previous ${PERIOD_NOUN[range]} to compare with.`
            ) : (
              <>
                {change > 0 ? (
                  <ArrowUpRight className="mr-0.5 inline size-3.5 align-[-3px] text-white/55" />
                ) : change < 0 ? (
                  <ArrowDownRight className="mr-0.5 inline size-3.5 align-[-3px] text-white/55" />
                ) : null}
                <span className="font-medium tabular-nums text-white/65">
                  {change === 0 ? "Same" : `${Math.abs(change)}% ${change > 0 ? "more" : "less"}`}
                </span>{" "}
                than the previous {PERIOD_NOUN[range]}.
              </>
            )}
          </p>
          <div className="grid grid-cols-3 divide-x divide-white/6 rounded-2xl bg-white/[0.04] py-3">
            <Stat label={UNIT[range].average} value={formatCurrency(Math.round(average))} />
            <Stat
              label={hasData ? `Peak · ${bucketName(peak).toLowerCase()}` : "Peak"}
              value={hasData ? formatCurrency(peak.total) : "—"}
            />
            <Stat label={UNIT[range].active} value={`${activeCount} / ${n}`} />
          </div>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-3 text-center">
      <p className="truncate text-[10px] text-white/35">{label}</p>
      <p className="mt-0.5 truncate text-[13px] font-medium tabular-nums text-white/80">{value}</p>
    </div>
  );
}

/** Daily / Weekly / Monthly as quiet text tabs. */
function RangeTabs({
  value,
  onChange,
}: {
  value: AnalyticsRange;
  onChange: (value: AnalyticsRange) => void;
}) {
  return (
    <div role="group" aria-label="Chart range" className="flex shrink-0 items-center">
      {RANGE_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          aria-label={option.label}
          className={cn(
            "flex h-8 min-w-8 items-center justify-center rounded-full text-xs font-medium transition-colors duration-200",
            value === option.value ? "bg-white/8 text-white/90" : "text-white/30 hover:text-white/70",
          )}
        >
          {option.label.charAt(0)}
        </button>
      ))}
    </div>
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
