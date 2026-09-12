"use client";

import { Minus, TrendingDown, TrendingUp } from "lucide-react";

import { formatCurrency } from "@/lib/transactions";
import { cn } from "@/lib/utils";

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
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10">
        <Icon className="size-3.5 text-foreground" />
      </div>
      <div className="flex min-w-0 flex-col">
        <span className="text-[11px] text-muted-foreground">Balance</span>
        <span
          className={cn(
            "truncate text-sm font-semibold tabular-nums",
            balance < 0 ? "text-rose-400" : "text-foreground",
          )}
        >
          {formatCurrency(balance)}
        </span>
      </div>
    </div>
  );
}
