"use client";

import { PiggyBank, TrendingDown, TrendingUp } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/transactions";
import { cn } from "@/lib/utils";

export function SavingsCard({
  savings,
  income,
  expense,
}: {
  /** Income minus expenses, across every transaction. */
  savings: number;
  income: number;
  expense: number;
}) {
  const rate = income > 0 ? Math.round((savings / income) * 100) : null;

  return (
    <Card className="animate-in fade-in slide-in-from-bottom-2 gap-4 py-5 duration-500 fill-mode-both">
      <CardHeader className="flex flex-row items-center justify-between px-5">
        <CardTitle className="text-sm font-normal text-muted-foreground">
          Savings
        </CardTitle>
        <PiggyBank className="size-4 text-muted-foreground" />
      </CardHeader>

      <CardContent className="flex flex-col gap-4 px-5">
        <div>
          <p
            className={cn(
              "text-2xl font-semibold tracking-tight tabular-nums",
              savings < 0 ? "text-rose-400" : "text-foreground",
            )}
          >
            {formatCurrency(savings)}
          </p>
          <p className="text-xs text-muted-foreground">
            Income minus expenses, so far
          </p>
        </div>

        <div className="flex flex-col gap-1.5 border-t border-white/10 pt-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">Total income</span>
            <span className="text-sm font-semibold tabular-nums text-foreground">
              {formatCurrency(income)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">Total expenses</span>
            <span className="text-sm font-semibold tabular-nums text-foreground">
              {formatCurrency(expense)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">Savings rate</span>
            <span className="text-sm font-semibold tabular-nums text-foreground">
              {rate === null ? "—" : `${rate}%`}
            </span>
          </div>
        </div>

        <div
          className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs",
            savings < 0
              ? "border-rose-500/20 bg-rose-500/10 text-rose-400"
              : "border-white/10 bg-white/3 text-muted-foreground",
          )}
        >
          {savings < 0 ? (
            <TrendingDown className="size-3.5 shrink-0" />
          ) : (
            <TrendingUp className="size-3.5 shrink-0" />
          )}
          <span>
            {savings < 0
              ? "You have spent more than you earned."
              : "Set this aside for your goals."}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
