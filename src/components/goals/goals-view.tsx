"use client";

import {
  ArrowUpDown,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  Check,
  ExternalLink,
  Gift,
  Hourglass,
  Pencil,
  PiggyBank,
  RotateCcw,
  Target,
  Trash2,
} from "lucide-react";
import * as React from "react";
import { toast } from "@yusufceng1z/ding-react";

import { useMonthNav } from "@/components/dashboard/navbar";
import { useTransactions } from "@/components/dashboard/transactions-provider";
import { GoalCompleteDialog } from "@/components/goals/goal-complete-dialog";
import { GoalDialog, type GoalDialogInput } from "@/components/goals/goal-dialog";
import { GoalReorderList } from "@/components/goals/goal-reorder-list";
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
import { useGoalImage } from "@/hooks/use-goal-image";
import { getCategoryIconByKey } from "@/lib/category-icons";
import { deleteGoalImage, saveGoalImage } from "@/lib/goal-images";
import { createId } from "@/lib/id";
import {
  goalLinkLabel,
  computeGoalProgress,
  computeGoalRemaining,
  computeSavingsPace,
  daysUntil,
  estimateGoalDates,
  formatEstimateDuration,
  goalPriceDelta,
  goalPriceTimeline,
  isGoalFunded,
  sortGoalsByPriority,
  type Goal,
  type GoalCompletion,
  type GoalCompletionSource,
  type GoalEstimate,
} from "@/lib/goals";
import { computeSavings } from "@/lib/savings";
import { cn } from "@/lib/utils";
import { formatCurrency, isWithinDateRange } from "@/lib/transactions";

export function GoalsView() {
  const {
    goals,
    completions,
    addGoal,
    updateGoal,
    reorderGoals,
    removeGoal,
    completeGoal,
    reopenGoal,
    isLoaded,
  } = useGoals();
  const { transactions, addTransactions } = useTransactions();
  const { monthAnchor } = useMonthNav();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Goal | null>(null);
  const [deleting, setDeleting] = React.useState<Goal | null>(null);
  const [completing, setCompleting] = React.useState<Goal | null>(null);
  /** The completed goal whose details are open. */
  const [viewing, setViewing] = React.useState<Goal | null>(null);
  /** Bumped on each completion to play the sparkle burst. */
  const [sparkle, setSparkle] = React.useState(0);
  /** Active goals shown as draggable rows to set their priority. */
  const [reordering, setReordering] = React.useState(false);

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

  // Active goals in the user's priority order: the top one is bought first.
  const activeRows = React.useMemo(() => {
    const byId = new Map(rows.map((row) => [row.goal.id, row]));
    return sortGoalsByPriority(
      rows.filter((row) => row.goal.status === "active").map((row) => row.goal),
    ).map((goal) => byId.get(goal.id)!);
  }, [rows]);
  const doneRows = rows.filter((row) => row.goal.status !== "active");
  const activeCount = activeRows.length;
  const fundedCount = activeRows.filter((row) => row.funded).length;
  const canReorder = activeCount > 1;
  const showReorder = reordering && canReorder;

  // How much a typical recent month saves, from the full ledger (not just
  // the navbar month), to project when each goal becomes affordable.
  const pace = React.useMemo(() => computeSavingsPace(transactions), [transactions]);
  const estimates = React.useMemo(
    () => estimateGoalDates(activeRows.map((row) => row.goal), savings, pace),
    [activeRows, savings, pace],
  );

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  async function handleSubmit({ image, ...input }: GoalDialogInput) {
    // The photo goes to IndexedDB first; the goal only stores its id.
    const previousImageId = editing?.imageId;
    let imageId = previousImageId;
    if (image === null) {
      imageId = undefined;
    } else if (image) {
      const nextId = createId();
      try {
        await saveGoalImage(nextId, image);
        imageId = nextId;
      } catch {
        toast.error("Couldn’t save the photo — storage may be full");
      }
    }
    if (previousImageId && previousImageId !== imageId) {
      deleteGoalImage(previousImageId).catch(() => {});
    }

    const fields = { ...input, links: input.links.length ? input.links : undefined, imageId };
    if (editing) {
      updateGoal(editing.id, fields);
      toast.success(`Updated ${input.label}`);
      return;
    }

    addGoal(fields);
    toast.success(`Added ${input.label}`);
  }

  function handleDelete() {
    if (!deleting) return;
    removeGoal(deleting.id);
    if (deleting.imageId) deleteGoalImage(deleting.imageId).catch(() => {});
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
            subtitle={
              showReorder
                ? "Drag to set priority. Top goals are bought first."
                : "Progress is measured against this month's savings"
            }
            action={
              canReorder ? (
                <SheetButton
                  onClick={() => setReordering((prev) => !prev)}
                  aria-pressed={showReorder}
                  className={cn(showReorder && "bg-white text-black hover:bg-white/90")}
                >
                  {showReorder ? <Check /> : <ArrowUpDown />}
                  {showReorder ? "Done" : "Reorder"}
                </SheetButton>
              ) : undefined
            }
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
              {showReorder ? (
                <GoalReorderList
                  goals={activeRows.map((row) => row.goal)}
                  onReorder={reorderGoals}
                  renderThumb={(goal) => (
                    <GoalThumb goal={goal} className="size-full" iconClassName="size-5" />
                  )}
                />
              ) : activeRows.length > 0 && (
                <div className="flex flex-col gap-3">
                  {activeRows.map((row) => (
                    <GoalCard
                      key={row.goal.id}
                      goal={row.goal}
                      savings={savings}
                      funded={row.funded}
                      progress={row.progress}
                      estimate={estimates.get(row.goal.id)}
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
                        <button
                          type="button"
                          onClick={() => setViewing(row.goal)}
                          aria-label={`View ${row.goal.label}`}
                          className="-my-1 -ml-2 flex min-w-0 flex-1 items-center gap-3 rounded-2xl py-1 pl-2 text-left transition-colors hover:bg-white/4 active:bg-white/6"
                        >
                        <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-white/8 text-white/80">
                          <GoalThumb goal={row.goal} className="size-10 rounded-full" iconClassName="size-4" />
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
                        </button>
                        {/* Same spacing as the edit / delete pair on active cards. */}
                        <div className="flex shrink-0 items-center gap-1.5">
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

      <CompletedGoalDialog
        goal={viewing}
        completion={
          viewing ? completions.find((entry) => entry.goalId === viewing.id) : undefined
        }
        onOpenChange={(open) => {
          if (!open) setViewing(null);
        }}
        onReopen={(goal) => {
          reopenGoal(goal.id);
          toast.success(`Reopened ${goal.label}`);
          setViewing(null);
        }}
        onDelete={(goal) => {
          setViewing(null);
          setDeleting(goal);
        }}
      />

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

/** The goal's photo when it has one, otherwise its icon. */
function GoalThumb({
  goal,
  className,
  iconClassName,
}: {
  goal: Goal;
  className?: string;
  iconClassName?: string;
}) {
  const url = useGoalImage(goal.imageId);
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- local blob URL
    return <img src={url} alt="" className={cn("object-cover", className)} />;
  }
  return <GoalIcon iconKey={goal.iconKey} className={iconClassName} />;
}

/** Bookmarked product links as compact chips showing just the site name. */
function GoalLinks({ links }: { links: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {links.map((href) => (
        <a
          key={href}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          title={href}
          className="flex h-7 max-w-[11rem] items-center gap-1.5 rounded-full bg-white/8 px-3 text-xs text-white/70 transition-colors hover:bg-white/12 hover:text-white active:scale-95"
        >
          <span className="truncate">{goalLinkLabel(href)}</span>
          <ExternalLink className="size-3 shrink-0 text-white/45" />
        </a>
      ))}
    </div>
  );
}

function formatDay(time: number) {
  return new Date(time).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * A completed goal's details: its photo (or icon), what it cost, when and
 * how it was got, how long it took, and the saved product links — with
 * Reopen and Delete at the bottom.
 */
function CompletedGoalDialog({
  goal,
  completion,
  onOpenChange,
  onReopen,
  onDelete,
}: {
  goal: Goal | null;
  completion?: GoalCompletion;
  onOpenChange: (open: boolean) => void;
  onReopen: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
}) {
  // Keep the last goal while the dialog animates closed.
  const [shown, setShown] = React.useState(goal);
  if (goal && goal !== shown) setShown(goal);
  const current = goal ?? shown;

  const completedAt = completion?.createdAt ?? current?.updatedAt;
  const daysTaken =
    current && completedAt
      ? Math.max(1, Math.round((completedAt - current.createdAt) / 86_400_000))
      : null;

  const details = current
    ? [
        completion && {
          icon: completion.source === "gift" ? Gift : PiggyBank,
          label: "How",
          value: completion.source === "gift" ? "It was a gift" : "Bought with savings",
        },
        completedAt && {
          icon: CalendarCheck,
          label: "Completed",
          value: formatDay(completedAt),
        },
        daysTaken && {
          icon: Hourglass,
          label: "Took",
          value: `${daysTaken} ${daysTaken === 1 ? "day" : "days"}`,
        },
        current.targetDate && {
          icon: CalendarDays,
          label: "Target date",
          value: completedAt
            ? `${formatDay(current.targetDate)} · ${completedAt >= current.targetDate + 86_400_000 ? "late" : "on time"}`
            : formatDay(current.targetDate),
        },
      ].filter((item): item is { icon: typeof Gift; label: string; value: string } => Boolean(item))
    : [];

  return (
    <Dialog open={goal !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {current && (
          <>
            <div className="flex flex-col items-center gap-3 pt-2 text-center">
              <span
                className={cn(
                  "relative flex items-center justify-center text-[#b9d0ff]",
                  current.imageId
                    ? "aspect-square w-40 overflow-hidden rounded-3xl bg-white/8"
                    : "size-20 rounded-3xl bg-white/6",
                )}
              >
                <GoalThumb goal={current} className="size-full" iconClassName="size-9" />
              </span>
              <span className="flex h-6 items-center gap-1.5 rounded-full bg-[#a9c4ff]/15 px-2.5 text-xs font-medium text-[#c7d8ff]">
                <Check className="size-3" strokeWidth={3} />
                Completed
              </span>
            </div>

            <DialogHeader className="items-center pr-0 text-center">
              <DialogTitle className="text-xl">{current.label}</DialogTitle>
              <DialogDescription className="font-display text-3xl font-semibold tracking-tight text-white tabular-nums">
                {formatCurrency(completion?.amount ?? current.targetAmount)}
              </DialogDescription>
            </DialogHeader>

            {details.length > 0 && (
              <div className="flex flex-col rounded-3xl bg-white/6 px-4 py-1">
                {details.map((item, index) => (
                  <div
                    key={item.label}
                    className={cn(
                      "flex items-center gap-3 py-3 text-sm",
                      index !== details.length - 1 && "border-b border-white/6",
                    )}
                  >
                    <item.icon className="size-4 shrink-0 text-white/45" />
                    <span className="text-white/55">{item.label}</span>
                    <span className="ml-auto truncate text-right text-white/90 tabular-nums">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <PriceHistory goal={current} />

            {current.links && current.links.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="px-1 text-xs text-white/50">Links</p>
                <GoalLinks links={current.links} />
              </div>
            )}

            <DialogFooter className="flex-col sm:flex-row">
              <Button size="lg" onClick={() => onReopen(current)}>
                <RotateCcw className="size-4" />
                Reopen goal
              </Button>
              <Button variant="outline" size="lg" onClick={() => onDelete(current)}>
                <Trash2 className="size-4" />
                Delete
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * How the price moved since the goal was added: a calm green when it got
 * cheaper, a muted rose when it went up. Nothing when it's unchanged.
 */
function PriceDeltaBadge({ delta }: { delta: number }) {
  if (delta === 0) return null;
  const dropped = delta < 0;
  return (
    <span
      className={cn("whitespace-nowrap", dropped ? "text-emerald-300/85" : "text-rose-300/80")}
      title={dropped ? "Cheaper than when you added it" : "Pricier than when you added it"}
    >
      {dropped ? "↓" : "↑"} {formatCurrency(delta)} since added
    </span>
  );
}

/**
 * When the goal becomes affordable at the recent saving pace, or why there
 * is no estimate. Kept to one quiet line under the progress bar.
 */
function EstimateLine({ estimate }: { estimate: Exclude<GoalEstimate, { kind: "ready" }> }) {
  let text: React.ReactNode;
  if (estimate.kind === "eta") {
    const month = new Date(estimate.date).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
    text = (
      <>
        At this pace: <span className="text-white/80">{month}</span>
        <span className="text-white/35"> · {formatEstimateDuration(estimate.months)}</span>
      </>
    );
  } else if (estimate.kind === "no-history") {
    text = "Log a full month to see an estimate";
  } else {
    text = "Save more each month to get an estimate";
  }
  return (
    <p className="flex items-center gap-1.5 text-xs tabular-nums text-white/50">
      <CalendarClock className="size-3.5 shrink-0 text-white/40" />
      <span className="truncate">{text}</span>
    </p>
  );
}

/**
 * Every price a goal has had, newest first, with the day it was set and how
 * it compares to the price before it. Only rendered when the price changed.
 */
function PriceHistory({ goal }: { goal: Goal }) {
  if (!goal.priceHistory?.length) return null;
  const timeline = goalPriceTimeline(goal);
  return (
    <div className="flex flex-col gap-2">
      <p className="px-1 text-xs text-white/50">Price history</p>
      <div className="flex flex-col rounded-3xl bg-white/6 px-4 py-1">
        {timeline
          .map((entry, index) => ({
            ...entry,
            change: index === 0 ? 0 : entry.amount - timeline[index - 1].amount,
            current: index === timeline.length - 1,
          }))
          .reverse()
          .map((entry, index, list) => (
            <div
              key={`${entry.since}-${index}`}
              className={cn(
                "flex items-center gap-3 py-2.5 text-sm tabular-nums",
                index !== list.length - 1 && "border-b border-white/6",
              )}
            >
              <span className="text-white/55">{formatDay(entry.since)}</span>
              {entry.change !== 0 && (
                <span
                  className={cn(
                    "text-xs",
                    entry.change < 0 ? "text-emerald-300/85" : "text-rose-300/80",
                  )}
                >
                  {entry.change < 0 ? "↓" : "↑"} {formatCurrency(entry.change)}
                </span>
              )}
              <span className={cn("ml-auto", entry.current ? "text-white/90" : "text-white/60")}>
                {formatCurrency(entry.amount)}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
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
  estimate,
  onComplete,
  onEdit,
  onDelete,
}: {
  goal: Goal;
  savings: number;
  funded: boolean;
  progress: number;
  estimate?: GoalEstimate;
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
        <span
          className={cn(
            "flex shrink-0 items-center justify-center overflow-hidden text-[#b9d0ff]",
            goal.imageId ? "size-12 rounded-2xl bg-white/8" : "size-10",
          )}
        >
          <GoalThumb goal={goal} className="size-full" iconClassName="size-6" />
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
          <p className="flex flex-wrap items-center gap-x-2 text-xs tabular-nums text-white/50">
            <span>{formatCurrency(goal.targetAmount)} goal</span>
            <PriceDeltaBadge delta={goalPriceDelta(goal)} />
          </p>
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

      {goal.links && goal.links.length > 0 && <GoalLinks links={goal.links} />}

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
            {funded ? "Ready to buy" : `${formatCurrency(goal.targetAmount - saved)} left`}
          </p>
        </div>
        <TickProgress progress={progress} funded={funded} />
        {estimate && estimate.kind !== "ready" && <EstimateLine estimate={estimate} />}
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
