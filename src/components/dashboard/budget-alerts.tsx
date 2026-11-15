"use client";

import { TriangleAlert } from "lucide-react";

import type { BudgetStanding } from "@/lib/budget-alerts";
import { formatCurrency } from "@/lib/transactions";
import { cn } from "@/lib/utils";

/**
 * A compact strip of the targets at or past 80% of their monthly cap, so a
 * near-miss is visible without reading every target row. Renders nothing
 * when every category is comfortably under.
 */
export function BudgetAlerts({ alerts }: { alerts: BudgetStanding[] }) {
  if (alerts.length === 0) return null;

  const overCount = alerts.filter((a) => a.threshold === 100).length;
  const anyOver = overCount > 0;

  return (
    <section
      aria-label="Budget alerts"
      className={cn(
        "flex flex-col gap-3 rounded-3xl p-4 ring-1",
        anyOver
          ? "bg-rose-500/[0.08] ring-rose-400/20"
          : "bg-amber-400/[0.06] ring-amber-300/15",
      )}
    >
      <div className="flex items-center gap-2">
        <TriangleAlert
          className={cn("size-4 shrink-0", anyOver ? "text-rose-300" : "text-amber-200")}
        />
        <p className="text-sm font-semibold text-white">
          {anyOver
            ? `${overCount} ${overCount === 1 ? "budget" : "budgets"} used up`
            : `${alerts.length} ${alerts.length === 1 ? "budget" : "budgets"} nearly used`}
        </p>
      </div>

      <ul className="flex flex-col gap-1.5">
        {alerts.map((alert) => {
          const isOver = alert.threshold === 100;
          return (
            <li
              key={alert.categoryKey}
              className="flex items-baseline justify-between gap-3 text-xs"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-1.5 shrink-0 translate-y-[-1px] rounded-full",
                    isOver ? "bg-rose-400" : "bg-amber-300",
                  )}
                />
                <span className="truncate text-white/85">{alert.categoryLabel}</span>
              </span>
              <span className="shrink-0 tabular-nums text-white/50">
                <span className={cn("font-medium", isOver ? "text-rose-300" : "text-amber-200")}>
                  {alert.percent}%
                </span>{" "}
                of {formatCurrency(alert.cap)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
