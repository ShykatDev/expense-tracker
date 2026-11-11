"use client";

import { Check, Target, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress, ProgressIndicator, ProgressTrack } from "@/components/ui/progress";
import { findCategoryByKey } from "@/lib/categories";
import { getCategoryIconByKey } from "@/lib/category-icons";
import {
  computeTargetProgress,
  computeTargetStatus,
  resolveTargetAmount,
  TARGET_STATUS_META,
  type CategoryTarget,
} from "@/lib/targets";
import { formatCurrency } from "@/lib/transactions";

export function TargetSummaryCard({
  monthLabel,
  monthKey,
  spentByCategoryLabel,
  targets,
  customCategories = [],
  onManage,
}: {
  monthLabel: string;
  monthKey: string;
  spentByCategoryLabel: Record<string, number>;
  targets: CategoryTarget[];
  customCategories?: import("@/lib/transactions").CustomCategory[];
  onManage?: () => void;
}) {
  if (targets.length === 0) {
    return (
      <Card className="animate-in fade-in slide-in-from-bottom-2 items-center justify-center gap-2 py-8 text-center duration-500 fill-mode-both">
        <Target className="size-5 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">
          No monthly targets yet
        </p>
        <p className="text-xs text-muted-foreground">
          Set a cap for a category to track how close you are to it.
        </p>
        {onManage && (
          <Button size="sm" className="mt-1 gap-1.5" onClick={onManage}>
            <Target className="size-4" />
            Set targets
          </Button>
        )}
      </Card>
    );
  }

  const rows = targets
    .map((target) => {
      const category = findCategoryByKey(target.categoryKey, customCategories);
      const label = category?.label ?? target.categoryLabel;
      const icon = category?.icon;
      const cap = resolveTargetAmount(target, monthKey);
      const spent = spentByCategoryLabel[label] ?? 0;

      return {
        key: target.categoryKey,
        label,
        icon,
        cap,
        spent,
        status: computeTargetStatus(spent, cap),
        progress: computeTargetProgress(spent, cap),
      };
    })
    .sort((a, b) => {
      if (a.status === "over" && b.status !== "over") return -1;
      if (b.status === "over" && a.status !== "over") return 1;
      return b.progress - a.progress;
    });

  return (
    <Card className="animate-in fade-in slide-in-from-bottom-2 gap-4 py-5 duration-500 fill-mode-both">
      <CardHeader className="flex flex-row items-center justify-between px-5">
        <CardTitle className="text-sm font-normal text-muted-foreground">
          Monthly targets
        </CardTitle>
        <span className="text-xs tabular-nums text-muted-foreground">
          {monthLabel}
        </span>
      </CardHeader>

      <CardContent className="flex flex-col gap-3 px-5">
        {rows.map((row) => {
          const Icon = row.icon ?? getCategoryIconByKey(null);
          const meta = TARGET_STATUS_META[row.status];
          const remaining = row.cap - row.spent;

          return (
            <div key={row.key} className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/10">
                  <Icon className="size-4 text-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {row.label}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                  {formatCurrency(row.spent)} / {formatCurrency(row.cap)}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <Progress value={row.progress * 100} className="flex-1">
                  <ProgressTrack>
                    <ProgressIndicator className={meta.bar} />
                  </ProgressTrack>
                </Progress>
                <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                  {Math.round(row.progress * 100)}%
                </span>
              </div>

              <div className="flex items-center gap-2">
                {row.status === "reached" ? (
                  <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-400">
                    <Check className="size-3.5" />
                    Target reached
                  </span>
                ) : row.status === "over" ? (
                  <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-rose-500/15 px-2.5 py-1 text-xs font-medium text-rose-400">
                    <TriangleAlert className="size-3.5" />
                    Over by {formatCurrency(Math.abs(remaining))}
                  </span>
                ) : (
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {formatCurrency(remaining)} left
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
