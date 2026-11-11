"use client";

import { ArrowDownRight, ArrowUpRight, Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { formatCurrency } from "@/lib/transactions";
import { cn } from "@/lib/utils";

/**
 * The full-width gradient hero at the top of the homepage.
 *
 * It carries three numbers — the month's savings, the savings rate and the
 * month-over-month change — plus the primary "add transaction" action, so the
 * most important information is above the fold.
 */
export function SavingsHero({
  savings,
  income,
  monthLabel,
  previousSavings,
}: {
  /** Savings for the selected month (income minus expenses). */
  savings: number;
  /** Income for the selected month, used for the savings rate. */
  income: number;
  /** e.g. "November 2026". */
  monthLabel: string;
  /** Savings for the month before the selected one. */
  previousSavings: number;
}) {
  const router = useRouter();

  const rate = income > 0 ? Math.round((savings / income) * 100) : null;

  const change = React.useMemo(() => {
    const diff = savings - previousSavings;
    if (previousSavings === 0) {
      if (diff === 0) return { direction: "flat" as const, percent: 0 };
      return { direction: "up" as const, percent: 100 };
    }
    const percent = (diff / Math.abs(previousSavings)) * 100;
    if (Math.abs(percent) < 0.5) return { direction: "flat" as const, percent: 0 };
    return {
      direction: diff > 0 ? ("up" as const) : ("down" as const),
      percent: Math.abs(Math.round(percent)),
    };
  }, [savings, previousSavings]);

  const ChangeIcon =
    change.direction === "up"
      ? ArrowUpRight
      : change.direction === "down"
        ? ArrowDownRight
        : Minus;

  return (
    <section
      className={cn(
        "relative isolate overflow-hidden rounded-3xl px-5 pt-6 pb-8 sm:px-8 sm:pt-8 sm:pb-10",
        "animate-in fade-in slide-in-from-top-2 duration-700 fill-mode-both",
        // The blue gradient, with two soft light sources for depth.
        "bg-[linear-gradient(145deg,#1d4ed8_0%,#2563eb_38%,#3b82f6_72%,#60a5fa_100%)]",
      )}
    >
      {/* Lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-16 size-64 rounded-full bg-white/25 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -bottom-28 size-72 rounded-full bg-indigo-300/30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/25"
      />

      {/* Header: identity on the left, the add action on the right. */}
      <div className="relative flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-full bg-white/20 text-sm font-semibold text-white ring-1 ring-white/30 backdrop-blur-sm">
            ET
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              Expense Tracker
            </p>
            <p className="truncate text-xs text-white/70">{monthLabel}</p>
          </div>
        </div>

        <button
          type="button"
          aria-label="Add transaction"
          onClick={() => router.push("/transaction")}
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full",
            "bg-white/20 text-white ring-1 ring-white/30 backdrop-blur-sm",
            "transition-all duration-200 hover:bg-white/30 active:scale-90",
          )}
        >
          <Plus className="size-5" />
        </button>
      </div>

      {/* The savings figure */}
      <div className="relative mt-8 flex flex-col gap-1">
        <p className="text-xs font-medium tracking-wide text-white/70 uppercase">
          Total savings
        </p>
        <p
          className={cn(
            "text-4xl font-semibold tracking-tight tabular-nums text-white sm:text-5xl",
            "transition-all duration-300",
          )}
        >
          {formatCurrency(savings)}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {rate !== null && (
            <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium tabular-nums text-white ring-1 ring-white/25 backdrop-blur-sm">
              {rate}% saved
            </span>
          )}

          <span
            className={cn(
              "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium tabular-nums backdrop-blur-sm ring-1",
              change.direction === "up"
                ? "bg-emerald-400/25 text-emerald-50 ring-emerald-200/30"
                : change.direction === "down"
                  ? "bg-rose-400/25 text-rose-50 ring-rose-200/30"
                  : "bg-white/15 text-white/80 ring-white/20",
            )}
          >
            <ChangeIcon className="size-3.5" />
            {change.direction === "flat"
              ? "No change"
              : `${change.percent}% vs last month`}
          </span>
        </div>
      </div>
    </section>
  );
}
