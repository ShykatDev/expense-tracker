"use client";

import { Pause, Play, Repeat, Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "@yusufceng1z/ding-react";

import { ExpandableSheet } from "@/components/layout/expandable-sheet";
import {
  AppHero,
  RowIconButton,
  SheetButton,
  SheetSection,
} from "@/components/layout/app-shell";
import { RecurringDueCard } from "@/components/recurring/recurring-due-card";
import { useRecurring } from "@/components/recurring/recurring-provider";
import { RecurringRuleDialog } from "@/components/recurring/recurring-rule-dialog";
import { RecurringCategoryIcon } from "@/components/recurring/recurring-shared";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Card } from "@/components/ui/card";
import type { RecurringRuleInput } from "@/hooks/use-recurring";
import {
  formatDueDate,
  describeSchedule,
  daysFromToday,
  nextOccurrence,
  pendingOccurrences,
  type RecurringRule,
} from "@/lib/recurring";
import { formatCurrency } from "@/lib/transactions";
import { undoToast } from "@/lib/undo-toast";
import { cn } from "@/lib/utils";
import { ProgressBar } from "@/components/ui/progress-bar";

/** Roughly what a rule costs (or brings in) per month, for the group totals. */
function monthlyEquivalent(rule: RecurringRule) {
  if (rule.frequency === "weekly") return (rule.amount * 52) / 12;
  if (rule.frequency === "yearly") return rule.amount / 12;
  return rule.amount;
}

/** Days in one cycle, for the "how close is the next one" bar. */
function cycleDays(rule: RecurringRule) {
  return rule.frequency === "weekly" ? 7 : rule.frequency === "yearly" ? 365 : 30;
}

/**
 * "Due in 5 days", "Due today", "Overdue by 3 days" — or "Expected …" for
 * income, which isn't something you owe.
 */
function dueSentence(daysLeft: number, income: boolean) {
  if (daysLeft < 0) return `Overdue by ${-daysLeft} ${daysLeft === -1 ? "day" : "days"}`;
  const verb = income ? "Expected" : "Due";
  if (daysLeft === 0) return `${verb} today`;
  if (daysLeft === 1) return `${verb} tomorrow`;
  return `${verb} in ${daysLeft} days`;
}

/**
 * One recurring rule. The top (tap to edit) carries the category tile, name,
 * note and schedule with the amount on the right; the footer says when the
 * next one is due over a bar that fills as it approaches — amber once
 * overdue — beside pause and delete.
 */
function RecurringRuleCard({
  rule,
  next,
  now,
  onEdit,
  onTogglePause,
  onDelete,
}: {
  rule: RecurringRule;
  next: ReturnType<typeof nextOccurrence>;
  now: number;
  onEdit: () => void;
  onTogglePause: () => void;
  onDelete: () => void;
}) {
  const daysLeft = next ? daysFromToday(next.dueDate, now) : null;
  const overdue = daysLeft !== null && daysLeft < 0;
  const progress =
    daysLeft === null ? 0 : overdue ? 1 : Math.min(Math.max(1 - daysLeft / cycleDays(rule), 0.04), 1);
  const income = rule.type === "income";
  const per = rule.frequency === "weekly" ? "/week" : rule.frequency === "yearly" ? "/year" : "/month";

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-3xl bg-white/6 p-4 transition-opacity",
        rule.paused && "opacity-55",
      )}
    >
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit ${rule.category}`}
        className="-m-1 flex items-center gap-3 rounded-2xl p-1 text-left transition-colors active:bg-white/4"
      >
        <RecurringCategoryIcon
          type={rule.type}
          category={rule.category}
          className="size-11 rounded-2xl [&_svg]:size-5"
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-base font-medium text-white">{rule.category}</span>
            {rule.note && (
              <span className="max-w-24 shrink-0 truncate rounded-full bg-white/8 px-2 py-0.5 text-[11px] text-white/60">
                {rule.note}
              </span>
            )}
          </span>
          <span className="block truncate text-xs text-white/50">{describeSchedule(rule)}</span>
        </span>
        <span className="shrink-0 text-right">
          <span
            className={cn(
              "block font-display text-lg leading-tight font-semibold tabular-nums",
              income ? "text-[#dfe8ff]" : "text-white",
            )}
          >
            {income ? "+" : ""}
            {formatCurrency(rule.amount)}
          </span>
          <span className="block text-[11px] text-white/40">{per}</span>
        </span>
      </button>

      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <p
            className={cn(
              "truncate text-xs tabular-nums",
              rule.paused ? "text-white/50" : overdue ? "text-amber-300" : "text-white/70",
            )}
          >
            {rule.paused
              ? "Paused — nothing will come up"
              : next && daysLeft !== null
                ? `${dueSentence(daysLeft, income)} · ${formatDueDate(next.dueDate, now)}`
                : "No upcoming date"}
          </p>
          {!rule.paused && next && (
            <ProgressBar
              value={progress}
              tone={overdue ? "amber" : income ? "pale" : "blue"}
            />
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <RowIconButton
            aria-label={rule.paused ? `Resume ${rule.category}` : `Pause ${rule.category}`}
            onClick={onTogglePause}
            className="bg-white/6"
          >
            {rule.paused ? <Play /> : <Pause />}
          </RowIconButton>
          <RowIconButton
            aria-label={`Delete ${rule.category}`}
            onClick={onDelete}
            className="bg-white/6"
          >
            <Trash2 />
          </RowIconButton>
        </div>
      </div>
    </div>
  );
}

/** Last moment of the month containing `now`. */
function endOfMonth(now: number) {
  const date = new Date(now);
  return new Date(date.getFullYear(), date.getMonth() + 1, 1).getTime() - 1;
}

/**
 * The recurring page: what's still due this month in the hero, the entries
 * waiting for a confirm, and every rule with its schedule and next date.
 * Reads from `RecurringProvider`, which lives in the root layout.
 */
export function RecurringView() {
  const { rules, due, now, addRule, updateRule, removeRule, restoreRule, setPaused, isLoaded } =
    useRecurring();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  /**
   * Bumped every time the form opens, so it remounts empty: nothing from
   * the last submission (or a cancelled draft) is left in it.
   */
  const [formKey, setFormKey] = React.useState(0);
  const [editing, setEditing] = React.useState<RecurringRule | null>(null);

  // Unconfirmed occurrences through the end of this month, overdue included:
  // the money still expected to go out (and come in) before the month ends.
  const month = React.useMemo(() => {
    const until = endOfMonth(now);
    let expense = 0;
    let income = 0;
    let bills = 0;
    for (const rule of rules) {
      for (const occurrence of pendingOccurrences(rule, until)) {
        if (occurrence.type === "income") {
          income += occurrence.amount;
        } else {
          expense += occurrence.amount;
          bills += 1;
        }
      }
    }
    return { expense, income, bills };
  }, [rules, now]);

  const rows = React.useMemo(
    () =>
      rules
        .map((rule) => ({ rule, next: nextOccurrence(rule) }))
        // Active first, soonest first; paused rules sink to the bottom.
        .sort((a, b) => {
          if (a.rule.paused !== b.rule.paused) return a.rule.paused ? 1 : -1;
          return (a.next?.dueDate ?? Infinity) - (b.next?.dueDate ?? Infinity);
        }),
    [rules],
  );

  // Bills and income apart, each with what it comes to per month.
  const groups = React.useMemo(
    () =>
      (["expense", "income"] as const).map((type) => {
        const typed = rows.filter((row) => row.rule.type === type);
        return {
          type,
          title: type === "expense" ? "Bills & payments" : "Income",
          rows: typed,
          perMonth: typed
            .filter((row) => !row.rule.paused)
            .reduce((sum, row) => sum + monthlyEquivalent(row.rule), 0),
        };
      }),
    [rows],
  );

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
    setFormKey((key) => key + 1);
  }

  function handleSubmit(input: RecurringRuleInput) {
    if (editing) {
      updateRule(editing.id, input);
      toast.success(`Updated ${input.category}`);
      return;
    }
    addRule(input);
    toast.success(`Added ${input.category}`);
  }

  /** Deletes at once, with Undo in the toast instead of a confirm dialog. */
  function handleDelete(rule: RecurringRule) {
    removeRule(rule.id);
    undoToast(`Deleted ${rule.category}`, () => restoreRule(rule));
  }

  const summary =
    month.bills === 0 && month.income === 0
      ? rules.length === 0
        ? "Set up rent, salary and bills once"
        : "All caught up this month"
      : [
          month.bills > 0 && `${month.bills} ${month.bills === 1 ? "bill" : "bills"} left`,
          month.income > 0 && `${formatCurrency(month.income)} income expected`,
        ]
          .filter(Boolean)
          .join(" · ");

  return (
    <>
      <ExpandableSheet
        hint="Swipe up for your recurring entries"
        previewDetails
        hero={
          <AppHero
            label="Due this month"
            value={<AnimatedNumber value={month.expense} format={formatCurrency} />}
            action={{ label: "Add recurring", onClick: openCreate }}
          >
            <p className="mt-1 text-xs text-white/55">{summary}</p>
          </AppHero>
        }
        details={
          <div className="flex flex-col gap-8">
            {due.length > 0 && (
              <SheetSection title="Waiting for you" subtitle="Confirm to add it to your history">
                <RecurringDueCard showHeader={false} />
              </SheetSection>
            )}

            <SheetSection
              title="Your recurring"
              subtitle="Tap one to edit. Nothing is added until you confirm it."
            >
              {!isLoaded ? (
                <Card className="gap-2 py-4">
                  {[0, 1, 2].map((index) => (
                    <div key={index} className="h-14 animate-pulse rounded-2xl bg-white/5" />
                  ))}
                </Card>
              ) : rows.length === 0 ? (
                <Card className="items-center justify-center gap-2 px-6 py-10 text-center">
                  <Repeat className="size-5 text-white/50" />
                  <p className="text-sm font-medium text-white">No recurring entries yet</p>
                  <p className="text-xs text-white/50">
                    Add rent, salary or a subscription once, then confirm it with a tap
                    each time it comes round.
                  </p>
                  <SheetButton className="mt-2" onClick={openCreate}>
                    <Repeat />
                    Add recurring
                  </SheetButton>
                </Card>
              ) : (
                <div className="flex flex-col gap-8">
                  {groups.map((group) =>
                    group.rows.length === 0 ? null : (
                      <div key={group.type} className="flex flex-col gap-3">
                        <div className="flex items-baseline justify-between px-1">
                          <h3 className="text-xs font-medium text-white/55">{group.title}</h3>
                          <span className="text-xs tabular-nums text-white/45">
                            ≈ {formatCurrency(group.perMonth)} a month
                          </span>
                        </div>
                        {group.rows.map(({ rule, next }) => (
                          <RecurringRuleCard
                            key={rule.id}
                            rule={rule}
                            next={next}
                            now={now}
                            onEdit={() => {
                              setEditing(rule);
                              setDialogOpen(true);
                              setFormKey((key) => key + 1);
                            }}
                            onTogglePause={() => {
                              setPaused(rule.id, !rule.paused);
                              toast.success(
                                rule.paused ? `Resumed ${rule.category}` : `Paused ${rule.category}`,
                              );
                            }}
                            onDelete={() => handleDelete(rule)}
                          />
                        ))}
                      </div>
                    ),
                  )}
                </div>
              )}
            </SheetSection>
          </div>
        }
      />

      <RecurringRuleDialog
        key={`${editing?.id ?? "create"}-${formKey}`}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing ?? undefined}
        onSubmit={handleSubmit}
      />

    </>
  );
}
