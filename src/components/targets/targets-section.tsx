"use client";

import { Pencil, Plus, Target, Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "@yusufceng1z/ding-react";

import { useCategories } from "@/components/categories/categories-provider";
import { useTransactions } from "@/components/dashboard/transactions-provider";
import { TargetDialog } from "@/components/targets/target-dialog";
import {
  getTargetState,
  TargetMeter,
  targetCardClass,
  targetIconClass,
} from "@/components/targets/target-meter";
import { useTargets } from "@/components/targets/targets-provider";
import { RowIconButton, SheetButton, SheetSection } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { findCategoryByKey, resolveCategories } from "@/lib/categories";
import {
  monthKey as toMonthKey,
  resolveTargetAmount,
  targetValueMonth,
  type CategoryTarget,
} from "@/lib/targets";
import { formatCurrency, isWithinDateRange } from "@/lib/transactions";
import { cn } from "@/lib/utils";

function formatMonthLabel(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  if (!year || !monthIndex) return month;
  return new Date(year, monthIndex - 1, 1).toLocaleDateString("en-US", {
    month: "short",
  });
}

export function TargetsSection() {
  const { categories } = useCategories();
  const {
    targets,
    upsertTarget,
    removeTarget,
    setTargetOverride,
    isLoaded,
  } = useTargets();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CategoryTarget | null>(null);
  const [deleting, setDeleting] = React.useState<CategoryTarget | null>(null);

  const currentMonth = React.useMemo(() => {
    const now = new Date();
    return {
      key: toMonthKey(now),
      label: now.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
    };
  }, []);

  // This month's spending per category, so each target shows how close it is.
  const { transactions } = useTransactions();
  const spentByLabel = React.useMemo(() => {
    const now = new Date();
    const map: Record<string, number> = {};
    for (const t of transactions) {
      if (t.type !== "expense" || !isWithinDateRange(t.createdAt, "month", now)) continue;
      map[t.category] = (map[t.category] ?? 0) + t.amount;
    }
    return map;
  }, [transactions]);

  const expenseCategories = React.useMemo(
    () => resolveCategories("expense", categories.expense),
    [categories.expense],
  );

  const allCustomCategories = React.useMemo(
    () => [...categories.income, ...categories.expense],
    [categories.income, categories.expense],
  );

  const rows = React.useMemo(
    () =>
      targets
        .map((target) => {
          const category = findCategoryByKey(
            target.categoryKey,
            allCustomCategories,
          );
          return {
            target,
            label: category?.label ?? target.categoryLabel,
            icon: category?.icon,
            deleted: !category,
          };
        })
        .sort((a, b) => a.label.localeCompare(b.label)),
    [targets, allCustomCategories],
  );

  /**
   * A new target sets the starting cap for every month. Changing one saves
   * the value for the current month only; later months carry it forward
   * until they get their own value, and earlier months keep theirs.
   */
  function handleSubmit(input: {
    categoryKey: string;
    categoryLabel: string;
    amount: number;
  }) {
    const existing = targets.find((t) => t.categoryKey === input.categoryKey);

    if (existing) {
      setTargetOverride(input.categoryKey, currentMonth.key, input.amount);
    } else {
      upsertTarget({
        categoryKey: input.categoryKey,
        categoryLabel: input.categoryLabel,
        amount: input.amount,
      });
    }

    toast.success(
      existing
        ? `Updated ${input.categoryLabel} target`
        : `Set a target for ${input.categoryLabel}`,
    );
  }

  function handleDelete() {
    if (!deleting) return;
    removeTarget(deleting.categoryKey);
    toast.success(`Removed ${deleting.categoryLabel} target`);
    setDeleting(null);
  }

  return (
    <SheetSection
      title="Monthly targets"
      subtitle="Cap what you spend each month on a category"
      action={
        <SheetButton
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus />
          Set target
        </SheetButton>
      }
    >
      {!isLoaded ? (
        <Card className="gap-2 py-4">
          {[0, 1].map((index) => (
            <div
              key={index}
              className="h-10 animate-pulse rounded-2xl bg-white/5"
            />
          ))}
        </Card>
      ) : rows.length === 0 ? (
        <Card className="items-center justify-center gap-1 py-6 text-center">
          <Target className="size-5 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            No targets set yet
          </p>
          <p className="text-xs text-muted-foreground">
            Set a cap and the dashboard will show how close you are to it.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row) => {
            const cap = resolveTargetAmount(row.target, currentMonth.key);
            const spent = spentByLabel[row.label] ?? 0;
            const state = getTargetState(spent, cap);
            const remaining = cap - spent;
            // Where this month's cap came from, when it was set in an earlier month.
            const sourceMonth = targetValueMonth(row.target, currentMonth.key);
            const carriedFrom =
              sourceMonth && sourceMonth !== currentMonth.key ? formatMonthLabel(sourceMonth) : null;

            return (
              <div
                key={row.target.categoryKey}
                className={cn(
                  "flex flex-col gap-3 rounded-3xl p-4 ring-1 transition-colors duration-500",
                  targetCardClass(state),
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-full",
                      targetIconClass(state),
                    )}
                  >
                    {row.icon ? <row.icon className="size-4" /> : <Target className="size-4" />}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-white/85">{row.label}</p>
                    <p className="mt-0.5 font-display text-lg leading-tight font-semibold tabular-nums text-white">
                      {formatCurrency(cap)}
                      <span className="ml-1 font-sans text-xs font-normal text-white/50">
                        / month{carriedFrom ? ` · since ${carriedFrom}` : ""}
                      </span>
                    </p>
                  </div>

                  <div className="-mt-1 -mr-1 flex shrink-0">
                    <RowIconButton
                      aria-label={`Edit ${row.label} target`}
                      onClick={() => {
                        setEditing(row.target);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil />
                    </RowIconButton>
                    <RowIconButton
                      aria-label={`Remove ${row.label} target`}
                      onClick={() => setDeleting(row.target)}
                    >
                      <Trash2 />
                    </RowIconButton>
                  </div>
                </div>

                <TargetMeter state={state} />

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span
                    className={cn(
                      "tabular-nums",
                      state.isOver ? "text-rose-200/80" : state.isNear ? "text-amber-200/80" : "text-white/50",
                    )}
                  >
                    {formatCurrency(spent)} spent ·{" "}
                    {state.isOver
                      ? `${formatCurrency(Math.abs(remaining))} over`
                      : `${formatCurrency(remaining)} left`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TargetDialog
        key={editing?.categoryKey ?? "create"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={editing ? "edit" : "create"}
        categories={expenseCategories}
        initial={
          editing
            ? {
                categoryKey: editing.categoryKey,
                categoryLabel: editing.categoryLabel,
                amount: resolveTargetAmount(editing, currentMonth.key),
              }
            : undefined
        }
        initialMonthLabel={currentMonth.label}
        onSubmit={handleSubmit}
      />

      <Dialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove target?</DialogTitle>
            <DialogDescription>
              {deleting
                ? `The monthly target for "${deleting.categoryLabel}" will be removed. Your entries are not affected.`
                : "The monthly target will be removed."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row">
            <Button variant="destructive" size="lg" onClick={handleDelete}>
              <Trash2 className="size-4" />
              Remove
            </Button>
            <DialogClose render={<Button variant="outline" size="lg" />}>
              Cancel
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SheetSection>
  );
}
