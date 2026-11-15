import type { Goal, GoalCompletion } from "@/lib/goals";
import { monthKey as toMonthKey } from "@/lib/targets";
import { computeTotals, type Transaction } from "@/lib/transactions";

/**
 * The previous-month recap shown on the dashboard at the start of a month.
 * Pure computation only; the card lives in components/dashboard.
 */

/** The recap shows on days 1–7 of the month, then gets out of the way. */
export const RECAP_VISIBLE_DAYS = 7;

/** Holds the "YYYY-MM" of the last recap the user dismissed. */
export const RECAP_DISMISSED_STORAGE_KEY = "expense-tracker:recap-dismissed";

export interface RecapCategory {
  category: string;
  total: number;
  /** Share of the month's expenses, 0–1. */
  share: number;
}

export interface RecapGoal {
  goalId: string;
  /** Falls back to "A goal" when the goal has since been deleted. */
  label: string;
  amount: number;
  source: GoalCompletion["source"];
}

export interface MonthlyRecap {
  /** "YYYY-MM" of the recapped month. */
  monthKey: string;
  /** e.g. "October". */
  monthLabel: string;
  income: number;
  expense: number;
  /** Income minus expense. Negative is a deficit. */
  saved: number;
  /** Savings of the month before, or null when nothing was logged then. */
  previousSaved: number | null;
  /** `saved - previousSaved`, or null without a previous month. */
  savedChange: number | null;
  /** Up to three expense categories, largest first. */
  topCategories: RecapCategory[];
  biggestExpense: Transaction | null;
  goalsCompleted: RecapGoal[];
  transactionCount: number;
}

function inMonth(transactions: Transaction[], month: string) {
  return transactions.filter((t) => toMonthKey(new Date(t.createdAt)) === month);
}

/**
 * Recap of the month before `now`'s month. Null when that month has no
 * transactions, since an empty recap says nothing useful.
 */
export function computeMonthlyRecap({
  transactions,
  completions = [],
  goals = [],
  now = new Date(),
}: {
  transactions: Transaction[];
  completions?: GoalCompletion[];
  goals?: Goal[];
  now?: Date;
}): MonthlyRecap | null {
  const monthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const month = toMonthKey(monthStart);
  const monthTransactions = inMonth(transactions, month);
  if (monthTransactions.length === 0) return null;

  const totals = computeTotals(monthTransactions);

  const previous = inMonth(
    transactions,
    toMonthKey(new Date(now.getFullYear(), now.getMonth() - 2, 1)),
  );
  const previousSaved = previous.length > 0 ? computeTotals(previous).balance : null;

  const byCategory = new Map<string, number>();
  let biggestExpense: Transaction | null = null;
  for (const t of monthTransactions) {
    if (t.type !== "expense") continue;
    byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + t.amount);
    if (!biggestExpense || t.amount > biggestExpense.amount) biggestExpense = t;
  }

  const topCategories = [...byCategory.entries()]
    .map(([category, total]) => ({
      category,
      total,
      share: totals.expense > 0 ? total / totals.expense : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  const goalsById = new Map(goals.map((g) => [g.id, g]));
  const goalsCompleted = completions
    .filter((c) => toMonthKey(new Date(c.createdAt)) === month)
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((c) => ({
      goalId: c.goalId,
      label: goalsById.get(c.goalId)?.label ?? "A goal",
      amount: c.amount,
      source: c.source,
    }));

  return {
    monthKey: month,
    monthLabel: monthStart.toLocaleDateString("en-US", { month: "long" }),
    income: totals.income,
    expense: totals.expense,
    saved: totals.balance,
    previousSaved,
    savedChange: previousSaved === null ? null : totals.balance - previousSaved,
    topCategories,
    biggestExpense,
    goalsCompleted,
    transactionCount: monthTransactions.length,
  };
}

/** Whether `now` falls in the recap window at the start of a month. */
export function isRecapWindow(now = new Date()) {
  return now.getDate() <= RECAP_VISIBLE_DAYS;
}
