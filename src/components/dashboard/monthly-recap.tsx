"use client";

import { ArrowDownRight, ArrowUpRight, PartyPopper, X } from "lucide-react";
import * as React from "react";

import { RowIconButton } from "@/components/layout/app-shell";
import { useGoals } from "@/components/goals/goals-provider";
import { useLocalStorageJson } from "@/hooks/use-local-storage";
import {
  computeMonthlyRecap,
  isRecapWindow,
  RECAP_DISMISSED_STORAGE_KEY,
} from "@/lib/monthly-recap";
import { formatCurrency, type Transaction } from "@/lib/transactions";
import { cn } from "@/lib/utils";
import { ProgressBar } from "@/components/ui/progress-bar";

function parseDismissed(raw: string) {
  const value: unknown = JSON.parse(raw);
  return typeof value === "string" ? value : null;
}

/**
 * Last month at a glance, shown for the first week of a new month until the
 * user dismisses it. It always recaps the calendar month before today, not
 * the navbar's month: it is a "month just ended" moment, not a report.
 */
export function MonthlyRecap({ transactions }: { transactions: Transaction[] }) {
  const { goals, completions } = useGoals();
  const [dismissed, setDismissed] = useLocalStorageJson<string | null>(
    RECAP_DISMISSED_STORAGE_KEY,
    parseDismissed,
    null,
  );

  const recap = React.useMemo(
    () =>
      isRecapWindow() ? computeMonthlyRecap({ transactions, completions, goals }) : null,
    [transactions, completions, goals],
  );

  if (!recap || dismissed === recap.monthKey) return null;

  const deficit = recap.saved < 0;
  const change = recap.savedChange;

  return (
    <section
      aria-label={`${recap.monthLabel} recap`}
      className="relative flex flex-col gap-4 overflow-hidden rounded-3xl p-5 ring-1 ring-white/10"
      style={{
        background:
          "radial-gradient(90% 70% at 100% 0%, rgba(75,122,214,0.22) 0%, rgba(75,122,214,0) 70%), linear-gradient(180deg, rgba(10,31,82,0.55) 0%, rgba(255,255,255,0.04) 100%)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-[#b9d0ff]/70">{recap.monthLabel} recap</p>
          <p
            className={cn(
              "mt-1 font-display text-[1.6rem] leading-none font-semibold tracking-tight tabular-nums",
              deficit ? "text-rose-200" : "text-white",
            )}
          >
            {formatCurrency(recap.saved)}
          </p>
          <p className="mt-1 text-xs text-white/50">
            {deficit ? "overspent" : "saved"} · {recap.transactionCount}{" "}
            {recap.transactionCount === 1 ? "entry" : "entries"}
          </p>
        </div>
        <RowIconButton
          aria-label="Dismiss recap"
          onClick={() => setDismissed(recap.monthKey)}
          className="-mt-1 -mr-1"
        >
          <X />
        </RowIconButton>
      </div>

      {change !== null && (
        <p className="flex items-center gap-1.5 text-xs text-white/60">
          <span
            className={cn(
              "flex items-center gap-0.5 rounded-full px-2 py-0.5 font-medium tabular-nums",
              change >= 0
                ? "bg-emerald-400/12 text-emerald-300"
                : "bg-rose-500/12 text-rose-300",
            )}
          >
            {change >= 0 ? (
              <ArrowUpRight className="size-3.5" />
            ) : (
              <ArrowDownRight className="size-3.5" />
            )}
            {formatCurrency(change)}
          </span>
          {change >= 0 ? "more" : "less"} saved than the month before
        </p>
      )}

      {recap.topCategories.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-medium text-white/50">Top spending</p>
          <ol className="flex flex-col gap-2">
            {recap.topCategories.map((row, index) => (
              <li key={row.category} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="truncate text-white/85">{row.category}</span>
                  <span className="shrink-0 tabular-nums text-white">
                    {formatCurrency(row.total)}
                  </span>
                </div>
                <ProgressBar
                  value={row.share}
                  minVisible={0.03}
                  tone={index === 0 ? "blue" : "muted"}
                />
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {recap.biggestExpense && (
          <div className="min-w-0 rounded-2xl bg-white/6 p-3">
            <p className="text-[11px] text-white/50">Biggest expense</p>
            <p className="mt-1 text-sm font-medium tabular-nums text-white">
              {formatCurrency(recap.biggestExpense.amount)}
            </p>
            <p className="truncate text-[11px] text-white/50">
              {recap.biggestExpense.category} ·{" "}
              {new Date(recap.biggestExpense.createdAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
              })}
            </p>
          </div>
        )}
        <div className="min-w-0 rounded-2xl bg-white/6 p-3">
          <p className="text-[11px] text-white/50">Goals completed</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-medium tabular-nums text-white">
            {recap.goalsCompleted.length > 0 && (
              <PartyPopper className="size-3.5 text-[#b9d0ff]" />
            )}
            {recap.goalsCompleted.length}
          </p>
          <p className="truncate text-[11px] text-white/50">
            {recap.goalsCompleted.length > 0
              ? recap.goalsCompleted.map((g) => g.label).join(", ")
              : "None this month"}
          </p>
        </div>
      </div>
    </section>
  );
}
