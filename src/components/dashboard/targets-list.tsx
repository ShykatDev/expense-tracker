"use client";

import { Check, Target, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { SheetButton, SheetSection } from "@/components/layout/app-shell";
import { findCategoryByKey } from "@/lib/categories";
import { getCategoryIconByKey } from "@/lib/category-icons";
import {
  computeTargetProgress,
  computeTargetStatus,
  resolveTargetAmount,
  type CategoryTarget,
} from "@/lib/targets";
import { formatCurrency, type CustomCategory } from "@/lib/transactions";
import { cn } from "@/lib/utils";

/**
 * The monthly budget targets, shown as a flat list rather than a card so the
 * analytics section above and the targets below read as one continuous dark
 * surface.
 */
export function TargetsList({
  monthKey,
  spentByCategoryLabel,
  targets,
  customCategories = [],
}: {
  monthKey: string;
  spentByCategoryLabel: Record<string, number>;
  targets: CategoryTarget[];
  customCategories?: CustomCategory[];
}) {
  const router = useRouter();

  if (targets.length === 0) {
    return (
      <section className="flex flex-col items-center justify-center gap-2 rounded-3xl bg-white/6 px-6 py-10 text-center">
        <Target className="size-5 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">
          No monthly targets yet
        </p>
        <p className="max-w-xs text-xs text-muted-foreground">
          Set a cap for a category to track how close you are to it.
        </p>
        <SheetButton className="mt-2" onClick={() => router.push("/categories")}>
          <Target />
          Set targets
        </SheetButton>
      </section>
    );
  }

  const rows = targets
    .map((target) => {
      const category = findCategoryByKey(target.categoryKey, customCategories);
      const label = category?.label ?? target.categoryLabel;
      const cap = resolveTargetAmount(target, monthKey);
      const spent = spentByCategoryLabel[label] ?? 0;

      return {
        key: target.categoryKey,
        label,
        icon: category?.icon,
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
    <SheetSection
      title="Budget targets"
      subtitle="Monthly caps for the categories you chose to limit"
      action={
        <SheetButton onClick={() => router.push("/categories")}>Manage</SheetButton>
      }
    >
      <div className="flex flex-col gap-2">
        {rows.map((row) => {
          const Icon = row.icon ?? getCategoryIconByKey(null);
          const remaining = row.cap - row.spent;
          // The real share, uncapped, so "130%" reads honestly when over.
          const percent = row.cap > 0 ? Math.round((row.spent / row.cap) * 100) : 0;
          const isOver = row.status === "over";
          const isReached = row.status === "reached";
          // A heads-up before the cap is hit.
          const isNear = !isOver && !isReached && percent >= 85;

          return (
            <div
              key={row.key}
              className={cn(
                "flex flex-col gap-3 rounded-3xl p-4 ring-1 transition-colors duration-500",
                isOver
                  ? "bg-rose-500/[0.09] ring-rose-400/25"
                  : isNear
                    ? "bg-amber-400/[0.06] ring-amber-300/15"
                    : "bg-white/6 ring-transparent",
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full",
                    isOver
                      ? "bg-rose-500/15 text-rose-300"
                      : isNear
                        ? "bg-amber-400/12 text-amber-200"
                        : "bg-white/8 text-white",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn("truncate text-sm", isOver ? "text-rose-50" : "text-white/85")}>
                    {row.label}
                  </p>
                  <p className={cn("text-xs tabular-nums", isOver ? "text-rose-200/60" : "text-white/40")}>
                    {formatCurrency(row.spent)} of {formatCurrency(row.cap)}
                  </p>
                </div>

                {isReached ? (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-400/12 px-2.5 py-1 text-xs font-medium text-emerald-300">
                    <Check className="size-3.5" />
                    Reached
                  </span>
                ) : isOver ? (
                  <span className="shrink-0 text-right">
                    <span className="flex items-center justify-end gap-1 text-sm font-semibold tabular-nums text-rose-300">
                      <TriangleAlert className="size-3.5" />
                      {formatCurrency(Math.abs(remaining))}
                    </span>
                    <span className="block text-[11px] text-rose-200/60">over budget</span>
                  </span>
                ) : (
                  <span className="shrink-0 text-right">
                    <span
                      className={cn(
                        "block text-sm font-medium tabular-nums",
                        isNear ? "text-amber-200" : "text-white",
                      )}
                    >
                      {formatCurrency(remaining)}
                    </span>
                    <span className={cn("block text-[11px]", isNear ? "text-amber-200/60" : "text-white/40")}>
                      {isNear ? "almost there" : "left"}
                    </span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className={cn("h-2 flex-1 overflow-hidden rounded-full", isOver ? "bg-rose-500/15" : "bg-white/8")}>
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width,background-color] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
                      isOver
                        ? "bg-linear-to-r from-rose-500/70 to-rose-400"
                        : isReached
                          ? "bg-emerald-400/60"
                          : isNear
                            ? "bg-linear-to-r from-amber-500/60 to-amber-300/90"
                            : "accent-gradient-x",
                    )}
                    style={{ width: `${Math.min(Math.max(percent, percent > 0 ? 3 : 0), 100)}%` }}
                  />
                </div>
                <span
                  className={cn(
                    "w-10 shrink-0 text-right text-[11px] tabular-nums",
                    isOver ? "font-medium text-rose-300" : isNear ? "text-amber-200/80" : "text-white/40",
                  )}
                >
                  {percent}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </SheetSection>
  );
}
