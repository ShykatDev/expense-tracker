"use client";

import { Check, Pencil, Target, Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "@yusufceng1z/ding-react";

import { useMonthNav } from "@/components/dashboard/navbar";
import { useTransactions } from "@/components/dashboard/transactions-provider";
import { GoalCompleteDialog } from "@/components/goals/goal-complete-dialog";
import { GoalDialog } from "@/components/goals/goal-dialog";
import { useGoals } from "@/components/goals/goals-provider";
import {
  AppHero,
  AppSheet,
  AppShell,
  HeroAmount,
  RowIconButton,
  SheetButton,
  SheetSection,
} from "@/components/layout/app-shell";
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
import { Progress, ProgressIndicator, ProgressTrack } from "@/components/ui/progress";
import { getCategoryIconByKey } from "@/lib/category-icons";
import {
  computeGoalProgress,
  computeGoalRemaining,
  daysUntil,
  isGoalFunded,
  type Goal,
  type GoalCompletionSource,
} from "@/lib/goals";
import { computeSavings } from "@/lib/savings";
import { formatCurrency, isWithinDateRange } from "@/lib/transactions";

export function GoalsView() {
  const { goals, addGoal, updateGoal, removeGoal, completeGoal, reopenGoal, isLoaded } =
    useGoals();
  const { transactions, addTransactions } = useTransactions();
  const { monthAnchor } = useMonthNav();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Goal | null>(null);
  const [deleting, setDeleting] = React.useState<Goal | null>(null);
  const [completing, setCompleting] = React.useState<Goal | null>(null);

  // Savings is measured against the navbar's month, so the goals page and
  // the dashboard always show the same figure.
  const savings = React.useMemo(
    () =>
      computeSavings(
        transactions.filter((t) =>
          isWithinDateRange(t.createdAt, "month", monthAnchor),
        ),
      ),
    [transactions, monthAnchor],
  );

  const rows = React.useMemo(
    () =>
      goals.map((goal) => {
        const funded = isGoalFunded(goal, savings);
        return {
          goal,
          funded,
          progress: computeGoalProgress(savings, goal.targetAmount),
          remaining: computeGoalRemaining(savings, goal.targetAmount),
        };
      }),
    [goals, savings],
  );

  const activeRows = rows.filter((row) => row.goal.status === "active");
  const activeCount = activeRows.length;
  const fundedCount = activeRows.filter((row) => row.funded).length;

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function handleSubmit(input: {
    label: string;
    targetAmount: number;
    iconKey: string;
    targetDate?: number;
  }) {
    if (editing) {
      updateGoal(editing.id, input);
      toast.success(`Updated ${input.label}`);
      return;
    }

    addGoal(input);
    toast.success(`Added ${input.label}`);
  }

  function handleDelete() {
    if (!deleting) return;
    removeGoal(deleting.id);
    toast.success(`Deleted ${deleting.label}`);
    setDeleting(null);
  }

  function handleComplete(source: GoalCompletionSource) {
    if (!completing) return;

    if (source === "savings") {
      // Buying the thing with your own savings is a real expense, so it is
      // written to the ledger and lands in the history.
      const [created] = addTransactions([
        {
          type: "expense",
          category: completing.label,
          amount: completing.targetAmount,
        },
      ]);
      completeGoal({
        goalId: completing.id,
        source,
        amount: completing.targetAmount,
        transactionId: created?.id,
      });
      toast.success(`${completing.label} completed — added to your history`);
    } else {
      completeGoal({
        goalId: completing.id,
        source,
        amount: completing.targetAmount,
      });
      toast.success(`${completing.label} completed`);
    }

    setCompleting(null);
  }

  return (
    <AppShell>
      <AppHero
        label="Saved this month"
        value={<HeroAmount value={savings} />}
        showMonthPicker
        action={{ label: "Add goal", onClick: openCreate }}
      >
        <p className="mt-1 text-xs text-white/55">
          {activeCount === 0
            ? "No active goals"
            : `${fundedCount} of ${activeCount} active ${activeCount === 1 ? "goal" : "goals"} affordable`}
        </p>
      </AppHero>

      <AppSheet>
      <SheetSection
        title="Your goals"
        subtitle="Progress is measured against this month's savings"
      >
      {!isLoaded ? (
        <Card className="gap-2 py-4">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="h-14 animate-pulse rounded-2xl bg-white/5"
            />
          ))}
        </Card>
      ) : rows.length === 0 ? (
        <Card className="items-center justify-center gap-2 px-6 py-10 text-center">
          <Target className="size-5 text-white/50" />
          <p className="text-sm font-medium text-white">No goals yet</p>
          <p className="text-xs text-white/50">
            Add a goal and see how close your savings are to affording it.
          </p>
          <SheetButton className="mt-2" onClick={openCreate}>
            <Target />
            Add goal
          </SheetButton>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row) => {
            const Icon = getCategoryIconByKey(row.goal.iconKey);
            const daysLeft = row.goal.targetDate
              ? daysUntil(row.goal.targetDate)
              : null;
            const isCompleted = row.goal.status === "completed";

            return (
              <div
                key={row.goal.id}
                className="flex flex-col gap-3 rounded-3xl bg-white/6 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/8">
                    <Icon className="size-4 text-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {row.goal.label}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <Badge
                        variant={isCompleted ? "secondary" : "outline"}
                        className={
                          isCompleted
                            ? "bg-emerald-500/15 text-emerald-400"
                            : undefined
                        }
                      >
                        {isCompleted
                          ? "Completed"
                          : row.goal.status === "archived"
                            ? "Archived"
                            : "Active"}
                      </Badge>
                      {daysLeft !== null && !isCompleted && (
                        <Badge
                          variant="outline"
                          className={
                            daysLeft < 0 ? "text-rose-400" : undefined
                          }
                        >
                          {daysLeft < 0
                            ? `${Math.abs(daysLeft)} days overdue`
                            : `${daysLeft} days left`}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {isCompleted ? (
                      <RowIconButton
                        aria-label={`Reopen ${row.goal.label}`}
                        onClick={() => {
                          reopenGoal(row.goal.id);
                          toast.success(`Reopened ${row.goal.label}`);
                        }}
                      >
                        <Check />
                      </RowIconButton>
                    ) : (
                      <RowIconButton
                        aria-label={`Complete ${row.goal.label}`}
                        onClick={() => setCompleting(row.goal)}
                      >
                        <Check />
                      </RowIconButton>
                    )}
                    <RowIconButton
                      aria-label={`Edit ${row.goal.label}`}
                      onClick={() => {
                        setEditing(row.goal);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil />
                    </RowIconButton>
                    <RowIconButton
                      aria-label={`Delete ${row.goal.label}`}
                      onClick={() => setDeleting(row.goal)}
                    >
                      <Trash2 />
                    </RowIconButton>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Progress value={row.progress * 100} className="flex-1">
                    <ProgressTrack>
                      <ProgressIndicator
                        className={
                          isCompleted
                            ? "bg-emerald-400"
                            : daysLeft !== null && daysLeft < 0
                              ? "bg-rose-400"
                              : "accent-gradient-x"
                        }
                      />
                    </ProgressTrack>
                  </Progress>
                  <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                    {Math.round(row.progress * 100)}%
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 text-xs tabular-nums">
                  <span className="text-white/50">
                    {isCompleted
                      ? "Completed"
                      : row.funded
                        ? "You can afford this"
                        : `${formatCurrency(row.remaining)} to go`}
                  </span>
                  <span className="font-medium text-white/80">
                    {formatCurrency(row.goal.targetAmount)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </SheetSection>
      </AppSheet>

      <GoalDialog
        key={editing?.id ?? "create"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={editing ? "edit" : "create"}
        initial={editing ?? undefined}
        onSubmit={handleSubmit}
      />

      <GoalCompleteDialog
        key={completing?.id ?? "complete"}
        open={completing !== null}
        onOpenChange={(open) => {
          if (!open) setCompleting(null);
        }}
        goalLabel={completing?.label ?? ""}
        goalAmount={completing?.targetAmount ?? 0}
        savings={savings}
        onConfirm={handleComplete}
      />

      <Dialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete goal?</DialogTitle>
            <DialogDescription>
              {deleting
                ? `"${deleting.label}" will be removed.`
                : "This goal will be removed."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row">
            <Button variant="destructive" size="lg" onClick={handleDelete}>
              <Trash2 className="size-4" />
              Delete
            </Button>
            <DialogClose render={<Button variant="outline" size="lg" />}>
              Cancel
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
