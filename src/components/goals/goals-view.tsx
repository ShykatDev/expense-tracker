"use client";

import { Check, Pencil, Target, Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "@yusufceng1z/ding-react";

import { useMonthNav } from "@/components/dashboard/navbar";
import { useTransactions } from "@/components/dashboard/transactions-provider";
import { GoalCompleteDialog } from "@/components/goals/goal-complete-dialog";
import { GoalDialog } from "@/components/goals/goal-dialog";
import { SparkleBurst } from "@/components/goals/sparkle-burst";
import { useGoals } from "@/components/goals/goals-provider";
import { ExpandableSheet } from "@/components/layout/expandable-sheet";
import {
  AppHero,
  HeroAmount,
  RowIconButton,
  SheetButton,
  SheetSection,
} from "@/components/layout/app-shell";
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
import { cn } from "@/lib/utils";
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
  /** Bumped on each completion to play the sparkle burst. */
  const [sparkle, setSparkle] = React.useState(0);

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

  // Affordable goals first: they're the ones ready to be marked as got.
  const activeRows = rows
    .filter((row) => row.goal.status === "active")
    .sort((a, b) => Number(b.funded) - Number(a.funded));
  const doneRows = rows.filter((row) => row.goal.status !== "active");
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

    setSparkle((count) => count + 1);
    setCompleting(null);
  }

  return (
    <>
      <ExpandableSheet
        hint="Swipe up for your goals"
        previewDetails
        hero={
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
        }
        details={
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
            <div className="flex flex-col gap-8">
              {activeRows.length > 0 && (
                <div className="flex flex-col gap-3">
                  {activeRows.map((row) => (
                    <GoalCard
                      key={row.goal.id}
                      goal={row.goal}
                      savings={savings}
                      funded={row.funded}
                      progress={row.progress}
                      onComplete={() => setCompleting(row.goal)}
                      onEdit={() => {
                        setEditing(row.goal);
                        setDialogOpen(true);
                      }}
                      onDelete={() => setDeleting(row.goal)}
                    />
                  ))}
                </div>
          )}

              {doneRows.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h3 className="px-1 text-xs font-medium text-white/50">Completed</h3>
                  <Card className="gap-0 py-1.5">
                    {doneRows.map((row) => (
                      <div key={row.goal.id} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-white/8 text-white/80">
                          <GoalIcon iconKey={row.goal.iconKey} className="size-4" />
                          <span className="absolute -right-0.5 -bottom-0.5 flex size-4 items-center justify-center rounded-full bg-[#a9c4ff] text-[#0a1f52] ring-2 ring-[#141518]">
                            <Check className="size-2.5" strokeWidth={3} />
                          </span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-white/85">{row.goal.label}</span>
                          <span className="block text-xs tabular-nums text-white/50">
                            {formatCurrency(row.goal.targetAmount)}
                          </span>
                        </span>
                        <SheetButton
                          onClick={() => {
                            reopenGoal(row.goal.id);
                            toast.success(`Reopened ${row.goal.label}`);
                          }}
                        >
                          Reopen
                        </SheetButton>
                        <RowIconButton
                          aria-label={`Delete ${row.goal.label}`}
                          onClick={() => setDeleting(row.goal)}
                          className={SUBTLE_ICON_BUTTON}
                        >
                          <Trash2 />
                        </RowIconButton>
                      </div>
                    ))}
                  </Card>
                </div>
          )}
            </div>
          )}
          </SheetSection>
        }
      />

      <SparkleBurst burst={sparkle} />

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
    </>
  );
}

/** Edit / delete on goal cards: a soft filled circle so they read as buttons. */
const SUBTLE_ICON_BUTTON = "bg-white/6";

/** A goal's chosen icon, rendered without creating a component per render. */
function GoalIcon({ iconKey, className }: { iconKey?: string; className?: string }) {
  return React.createElement(getCategoryIconByKey(iconKey), { className });
}

/** Linear blend between two "#rrggbb" colours. */
function mixHex(from: string, to: string, t: number) {
  const f = parseInt(from.slice(1), 16);
  const g = parseInt(to.slice(1), 16);
  const channel = (shift: number) =>
    Math.round(((f >> shift) & 255) + (((g >> shift) & 255) - ((f >> shift) & 255)) * t);
  return `rgb(${channel(16)}, ${channel(8)}, ${channel(0)})`;
}

/**
 * Goal progress as a row of fine ticks. Filled ticks stand taller and run as
 * one gradient, deep navy to the hero's blue (pale blue once affordable),
 * and the last filled tick glows softly — a radial halo that breathes with
 * an opacity-only animation, so it stays cheap on mobile.
 */
function TickProgress({ progress, funded }: { progress: number; funded: boolean }) {
  const TICKS = 56;
  const filled = Math.round(progress * TICKS);
  const start = "#16306d";
  const end = funded ? "#dfe8ff" : "#7fa3ec";

  return (
    <div className="flex h-5 items-center justify-between" aria-hidden="true">
      {Array.from({ length: TICKS }, (_, i) => {
        const isFilled = i < filled;
        const isLast = isFilled && i === filled - 1;
        const color = isFilled ? mixHex(start, end, filled > 1 ? i / (filled - 1) : 1) : undefined;
        return (
          <span key={i} className="relative flex h-full w-[2.5px] items-center justify-center">
            {isLast && (
              <span
                className="tick-glow pointer-events-none absolute size-6 rounded-full"
                style={{
                  background: `radial-gradient(circle, ${funded ? "rgba(223,232,255,0.55)" : "rgba(127,163,236,0.6)"} 0%, rgba(127,163,236,0) 70%)`,
                }}
              />
            )}
            <span
              className={cn(
                "relative w-full rounded-full transition-[height,background-color] duration-500",
                isFilled ? "h-4" : "h-2.5 bg-white/12",
                isLast && "h-5",
              )}
              style={{ backgroundColor: color, transitionDelay: `${i * 8}ms` }}
            />
          </span>
        );
      })}
    </div>
  );
}

/**
 * One active goal. A header with the icon tile, name, price and a deadline
 * chip; the progress as a large percentage with what's saved, over a
 * progress bar; and a "Got …" button — a quiet outline until savings cover
 * the goal, then solid pale blue with a periodic shine and bounce that
 * invite the tap. The button is always available — a goal can
 * be a gift, or bought on a stretch.
 */
function GoalCard({
  goal,
  savings,
  funded,
  progress,
  onComplete,
  onEdit,
  onDelete,
}: {
  goal: Goal;
  savings: number;
  funded: boolean;
  progress: number;
  onComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const daysLeft = goal.targetDate ? daysUntil(goal.targetDate) : null;
  const overdue = daysLeft !== null && daysLeft < 0;
  const percent = Math.round(progress * 100);
  const saved = Math.min(Math.max(savings, 0), goal.targetAmount);

  return (
    <div className="flex flex-col gap-5 rounded-3xl bg-white/6 p-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center text-[#b9d0ff]">
          <GoalIcon iconKey={goal.iconKey} className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-base font-medium text-white">{goal.label}</p>
            {daysLeft !== null && (
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[11px] tabular-nums",
                  overdue ? "bg-rose-500/15 text-rose-300" : "bg-white/8 text-white/60",
                )}
              >
                {overdue ? `${Math.abs(daysLeft)}d late` : daysLeft === 0 ? "today" : `${daysLeft}d`}
              </span>
            )}
          </div>
          <p className="text-xs tabular-nums text-white/50">{formatCurrency(goal.targetAmount)} goal</p>
        </div>
        <div className="flex shrink-0 gap-1.5 self-start">
          <RowIconButton aria-label={`Edit ${goal.label}`} onClick={onEdit} className={SUBTLE_ICON_BUTTON}>
            <Pencil />
          </RowIconButton>
          <RowIconButton aria-label={`Delete ${goal.label}`} onClick={onDelete} className={SUBTLE_ICON_BUTTON}>
            <Trash2 />
          </RowIconButton>
        </div>
      </div>

      {/* Progress */}
      <div className="flex flex-col gap-2.5" aria-label={`${percent}% saved towards ${goal.label}`}>
        <div className="flex items-end justify-between gap-3">
          <p
            className={cn(
              "font-display text-[2rem] leading-none font-semibold tracking-tight tabular-nums",
              funded ? "text-[#d6e4ff]" : "text-white",
            )}
          >
            {percent}
            <span className="ml-1 text-lg text-white/50">%</span>
          </p>
          <p className="pb-0.5 text-xs tabular-nums text-white/50">
            {funded ? "Ready to buy" : `${formatCurrency(saved)} saved`}
          </p>
        </div>
        <TickProgress progress={progress} funded={funded} />
      </div>

      {/* Action: solid pale blue once affordable, a quiet outline until then. */}
      <button
        type="button"
        onClick={onComplete}
        className={cn(
          "relative flex h-12 w-full items-center justify-center gap-2.5 overflow-hidden rounded-full text-[15px] font-medium transition-[background-color,transform] duration-200 active:scale-[0.98]",
          funded
            ? "bg-[#dfe8ff] text-[#0a1f52] hover:bg-[#eaf0ff]"
            : "bg-transparent text-white/80 ring-1 ring-white/15 hover:bg-white/[0.04] hover:text-white",
        )}
      >
        {/* Ready to claim: a light streak sweeps across every few seconds. */}
        {funded && (
          <span
            aria-hidden="true"
            className="claim-shine pointer-events-none absolute inset-y-0 left-0 w-2/5 bg-linear-to-r from-transparent via-[#8fb0f5]/55 to-transparent"
          />
        )}
        <span
          className={cn(
            "relative flex size-5 items-center justify-center rounded-full",
            funded ? "claim-bounce bg-[#0a1f52] text-[#dfe8ff]" : "bg-white/10 text-white/80",
          )}
        >
          <Check className="size-3" strokeWidth={3} />
        </span>
        <span className="relative truncate">Got {goal.label}</span>
      </button>
    </div>
  );
}
