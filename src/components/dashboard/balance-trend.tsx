"use client";

import { Minus, TrendingDown, TrendingUp } from "lucide-react";

import { formatCurrency } from "@/lib/transactions";

export function BalanceTrend({
  balance,
  changePercent,
}: {
  balance: number;
  changePercent: number | null;
}) {
  const Icon =
    !changePercent ? Minus : changePercent > 0 ? TrendingUp : TrendingDown;

  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10">
        <Icon className="size-4 text-foreground" />
      </div>
      <div className="flex min-w-0 flex-col">
        <span className="text-[11px] text-muted-foreground">Balance</span>
        <span className="truncate text-sm font-semibold tabular-nums">
          {formatCurrency(balance)}
        </span>
      </div>
    </div>
  );
}
