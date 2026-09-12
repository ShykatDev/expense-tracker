"use client";

import { Wallet } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, getSpendingInsight } from "@/lib/transactions";
import { cn } from "@/lib/utils";

import { OverviewChart } from "./overview-chart";

const INSIGHT_TONE_STYLES = {
  positive: "bg-emerald-500/15 text-emerald-400",
  warning: "bg-rose-500/15 text-rose-400",
  neutral: "bg-amber-500/15 text-amber-400",
} as const;

export function BalanceOverviewCard({
  balance,
  income,
  expense,
  data,
}: {
  balance: number;
  income: number;
  expense: number;
  data: { category: string; type: "income" | "expense"; total: number }[];
}) {
  const insight = getSpendingInsight(income, expense);

  return (
    <Card className="gap-4 py-5 animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both">
      <CardHeader className="flex flex-row items-center justify-between px-5">
        <CardTitle className="text-sm font-normal text-muted-foreground">
          Balance
        </CardTitle>
        <Wallet className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="flex items-end justify-between gap-3 px-5">
        <p className="text-3xl font-semibold tracking-tight tabular-nums text-foreground">
          {formatCurrency(balance)}
        </p>
        {insight && (
          <div
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium",
              INSIGHT_TONE_STYLES[insight.tone],
            )}
          >
            <insight.icon className="size-3.5" />
            {insight.label}
          </div>
        )}
      </CardContent>
      <CardContent className="border-t border-white/10 px-5 pt-4">
        <OverviewChart data={data} />
      </CardContent>
    </Card>
  );
}
