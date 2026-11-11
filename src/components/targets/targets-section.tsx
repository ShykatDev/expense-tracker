"use client";

import { Pencil, Plus, Target, Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "@yusufceng1z/ding-react";

import { useCategories } from "@/components/categories/categories-provider";
import { TargetDialog } from "@/components/targets/target-dialog";
import { useTargets } from "@/components/targets/targets-provider";
import { RowIconButton, SheetButton, SheetSection } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
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
  type CategoryTarget,
} from "@/lib/targets";
import { formatCurrency } from "@/lib/transactions";

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

  function handleSubmit(input: {
    categoryKey: string;
    categoryLabel: string;
    amount: number;
    overrideMonth?: string;
    overrideAmount?: number;
  }) {
    const existing = targets.find((t) => t.categoryKey === input.categoryKey);

    upsertTarget({
      categoryKey: input.categoryKey,
      categoryLabel: input.categoryLabel,
      amount: input.amount,
    });

    if (input.overrideMonth && input.overrideAmount !== undefined) {
      setTargetOverride(input.categoryKey, input.overrideMonth, input.overrideAmount);
    } else if (existing && input.overrideMonth) {
      setTargetOverride(input.categoryKey, input.overrideMonth, undefined);
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
              className="h-10 animate-pulse rounded-lg bg-white/5"
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
        <Card className="gap-0 py-1">
          {rows.map((row, index) => {
            const cap = resolveTargetAmount(row.target, currentMonth.key);
            const overrides = Object.entries(row.target.overrides);

            return (
              <div
                key={row.target.categoryKey}
                className={`flex items-center gap-3 px-4 py-3 ${
                  index !== rows.length - 1 ? "border-b border-white/6" : ""
                }`}
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/8">
                  {row.icon ? (
                    <row.icon className="size-4 text-foreground" />
                  ) : (
                    <Target className="size-4 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {row.label}
                  </p>
                  {overrides.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {overrides.map(([month, amount]) => (
                        <Badge
                          key={month}
                          variant="outline"
                          className="text-[0.65rem]"
                        >
                          {formatMonthLabel(month)}:{" "}
                          {formatCurrency(amount)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <Badge variant="secondary" className="tabular-nums">
                  {formatCurrency(cap)}
                </Badge>
                <div className="flex shrink-0 gap-1">
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
            );
          })}
        </Card>
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
                amount: editing.amount,
                overrideMonth: currentMonth.key,
                overrideAmount: editing.overrides[currentMonth.key],
              }
            : undefined
        }
        initialMonth={currentMonth.key}
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
