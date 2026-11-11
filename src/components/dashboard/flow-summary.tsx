"use client";

import { ArrowDownRight, ArrowUpRight, Scale } from "lucide-react";
import * as React from "react";

import { formatCurrency } from "@/lib/transactions";
import { cn } from "@/lib/utils";

/**
 * A compact income / expense / net-balance strip that sits between the hero
 * and the analytics. It is deliberately flat — a row of figures rather than a
 * pair of oversized dashboard cards — so the page keeps a single hierarchy.
 */
export function FlowSummary({
  income,
  expense,
  balance,
}: {
  income: number;
  expense: number;
  balance: number;
}) {
  return (
    <section
      className={cn(
        "animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both",
        "grid grid-cols-3 gap-3",
      )}
    >
      <FlowTile
        label="Income"
        value={income}
        tone="positive"
        icon={ArrowUpRight}
        delay={0}
      />
      <FlowTile
        label="Expenses"
        value={expense}
        tone="negative"
        icon={ArrowDownRight}
        delay={75}
      />
      <FlowTile
        label="Net balance"
        value={balance}
        tone={balance < 0 ? "negative" : "neutral"}
        icon={Scale}
        delay={150}
      />
    </section>
  );
}

function FlowTile({
  label,
  value,
  tone,
  icon: Icon,
  delay,
}: {
  label: string;
  value: number;
  tone: "positive" | "negative" | "neutral";
  icon: typeof ArrowUpRight;
  delay: number;
}) {
  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className={cn(
        "animate-in fade-in slide-in-from-bottom-2 flex min-w-0 flex-col gap-1.5 rounded-2xl border border-white/10 bg-white/5 p-3.5 duration-500 fill-mode-both",
      )}
    >
      <div className="flex items-center gap-1.5">
        <Icon
          className={cn(
            "size-3.5 shrink-0",
            tone === "positive"
              ? "text-emerald-400"
              : tone === "negative"
                ? "text-rose-400"
                : "text-muted-foreground",
          )}
        />
        <p className="truncate text-[10px] font-medium tracking-wide text-muted-foreground uppercase sm:text-[11px]">
          {label}
        </p>
      </div>
      <p
        className={cn(
          "truncate text-base font-semibold tracking-tight tabular-nums sm:text-lg",
          tone === "positive"
            ? "text-emerald-400"
            : tone === "negative"
              ? "text-rose-400"
              : "text-foreground",
        )}
      >
        {formatCurrency(value)}
      </p>
    </div>
  );
}
