"use client";

import * as React from "react";

import { SheetSection } from "@/components/layout/app-shell";
import { formatCurrency, type Transaction } from "@/lib/transactions";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

/**
 * Sequential navy → blue steps, taken from the hero and accent gradients so
 * the heaviest days glow the same blue as the rest of the sheet. Index 0 is
 * a day with nothing spent.
 */
const SHADES = [
  { bg: "rgba(255,255,255,0.04)", text: "rgba(255,255,255,0.45)" },
  { bg: "#0f2a63", text: "rgba(255,255,255,0.75)" },
  { bg: "#173a82", text: "rgba(255,255,255,0.85)" },
  { bg: "#2a55b0", text: "#ffffff" },
  { bg: "#4b7ad6", text: "#ffffff" },
  { bg: "#7fa3ec", text: "#0a1f52" },
];

/**
 * Spend → shade index. A square-root scale keeps a month with one huge rent
 * day from flattening every other day into the faintest step.
 */
function shadeIndex(total: number, max: number) {
  if (total <= 0 || max <= 0) return 0;
  const steps = SHADES.length - 1;
  return Math.max(1, Math.ceil(Math.sqrt(total / max) * steps));
}

interface DayCell {
  day: number;
  total: number;
  count: number;
}

/** One cell per day of the anchor's month with its expense total and count. */
function buildDays(transactions: Transaction[], monthAnchor: Date): DayCell[] {
  const year = monthAnchor.getFullYear();
  const month = monthAnchor.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: DayCell[] = Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    total: 0,
    count: 0,
  }));
  for (const t of transactions) {
    if (t.type !== "expense") continue;
    const date = new Date(t.createdAt);
    if (date.getFullYear() !== year || date.getMonth() !== month) continue;
    const cell = cells[date.getDate() - 1];
    cell.total += t.amount;
    cell.count += 1;
  }
  return cells;
}

/**
 * The navbar month as a calendar, each day shaded by what was spent on it
 * (expenses only). Tapping a day shows its total and number of entries.
 */
export function SpendingCalendar({
  transactions,
  monthAnchor,
}: {
  /** The navbar month's transactions. */
  transactions: Transaction[];
  monthAnchor: Date;
}) {
  const year = monthAnchor.getFullYear();
  const month = monthAnchor.getMonth();
  const leading = new Date(year, month, 1).getDay();

  const days = React.useMemo(
    () => buildDays(transactions, monthAnchor),
    [transactions, monthAnchor],
  );

  const total = days.reduce((sum, d) => sum + d.total, 0);
  const peak = days.reduce<DayCell | null>(
    (best, d) => (d.total > 0 && (!best || d.total > best.total) ? d : best),
    null,
  );
  const max = peak?.total ?? 0;

  // Keyed by month so a pick never carries over to another month.
  const monthId = `${year}-${month}`;
  const [selected, setSelected] = React.useState<{ monthId: string; day: number } | null>(
    null,
  );
  const selectedDay = selected?.monthId === monthId ? days[selected.day - 1] : null;

  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;
  const today = isCurrentMonth ? now.getDate() : null;

  const dayLabel = (day: number) =>
    new Date(year, month, day).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

  return (
    <SheetSection
      title="Spending calendar"
      subtitle={
        total > 0 ? `${formatCurrency(total)} spent this month` : "Nothing spent this month yet"
      }
      action={
        <div aria-hidden="true" className="flex shrink-0 items-center gap-1 text-[10px] text-white/40">
          Less
          {SHADES.map((shade) => (
            <span
              key={shade.bg}
              className="size-2.5 rounded-[3px]"
              style={{ backgroundColor: shade.bg }}
            />
          ))}
          More
        </div>
      }
    >
      <div className="flex flex-col gap-3 rounded-3xl bg-white/6 p-4">
        <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-medium text-white/40">
          {WEEKDAYS.map((label, index) => (
            <span key={index} aria-hidden="true">
              {label}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: leading }, (_, i) => (
            <span key={`pad-${i}`} aria-hidden="true" />
          ))}
          {days.map((cell) => {
            const shade = SHADES[shadeIndex(cell.total, max)];
            const isSelected = selectedDay?.day === cell.day;
            const isFuture = today !== null && cell.day > today;
            return (
              <button
                key={cell.day}
                type="button"
                aria-pressed={isSelected}
                aria-label={`${dayLabel(cell.day)}: ${
                  cell.total > 0 ? formatCurrency(cell.total) : "no spending"
                }`}
                onClick={() =>
                  setSelected(isSelected ? null : { monthId, day: cell.day })
                }
                className={cn(
                  "flex aspect-square items-center justify-center rounded-xl text-[11px] font-medium tabular-nums ring-inset transition-shadow duration-150",
                  isSelected
                    ? "ring-2 ring-white"
                    : cell.day === today
                      ? "ring-1 ring-white/40"
                      : "ring-0",
                  isFuture && "opacity-40",
                )}
                style={{ backgroundColor: shade.bg, color: shade.text }}
              >
                {cell.day}
              </button>
            );
          })}
        </div>

        <div className="pt-1">
          <p className="min-w-0 truncate text-center text-xs text-white/60" aria-live="polite">
            {selectedDay ? (
              <>
                <span className="text-white/85">{dayLabel(selectedDay.day)}</span>
                {" · "}
                {selectedDay.count > 0 ? (
                  <>
                    <span className="font-medium tabular-nums text-white">
                      {formatCurrency(selectedDay.total)}
                    </span>{" "}
                    in {selectedDay.count} {selectedDay.count === 1 ? "expense" : "expenses"}
                  </>
                ) : (
                  "no spending"
                )}
              </>
            ) : (
              "Tap a day for its total"
            )}
          </p>
        </div>
      </div>

      {peak && (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-3xl bg-white/6 px-4 py-3">
            <p className="text-[11px] text-white/50">Month total</p>
            <p className="mt-1 text-sm font-medium tabular-nums text-white">
              {formatCurrency(total)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSelected({ monthId, day: peak.day })}
            className="rounded-3xl bg-white/6 px-4 py-3 text-left transition-colors hover:bg-white/10"
          >
            <p className="text-[11px] text-white/50">Most expensive day</p>
            <p className="mt-1 truncate text-sm font-medium tabular-nums text-white">
              {formatCurrency(peak.total)}
              <span className="font-normal text-white/50"> · {dayLabel(peak.day)}</span>
            </p>
          </button>
        </div>
      )}
    </SheetSection>
  );
}
