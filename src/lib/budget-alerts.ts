import { findCategoryByKey } from "@/lib/categories";
import {
  monthKey as toMonthKey,
  resolveTargetAmount,
  type CategoryTarget,
} from "@/lib/targets";
import {
  formatCurrency,
  type CustomCategory,
  type Transaction,
} from "@/lib/transactions";

/**
 * Budget alerts: heads-ups at 80% and 100% of a category's monthly target.
 *
 * Everything here is pure so the same rules drive the dashboard strip and the
 * toast shown after saving a transaction.
 */

/** The share of a cap that triggers each alert, in percent. */
export const BUDGET_ALERT_THRESHOLDS = [80, 100] as const;
export type BudgetThreshold = (typeof BUDGET_ALERT_THRESHOLDS)[number];

/** Where one target stands for one month. */
export interface BudgetStanding {
  categoryKey: string;
  /** Current label: the live category's label, else the target's cached one. */
  categoryLabel: string;
  /** "YYYY-MM" the figures are for. */
  monthKey: string;
  spent: number;
  cap: number;
  /** Real share of the cap spent, uncapped and rounded, so "130%" reads honestly. */
  percent: number;
  /** The highest threshold reached, or null when below 80%. */
  threshold: BudgetThreshold | null;
}

/** A save that pushed a category over a threshold it was under before. */
export interface BudgetCrossing {
  categoryKey: string;
  categoryLabel: string;
  monthKey: string;
  /** The highest threshold crossed by this save (100 wins over 80). */
  threshold: BudgetThreshold;
  /** Share of the cap spent after the save, rounded. */
  percent: number;
  /** Spent after the save. */
  spent: number;
  cap: number;
}

/**
 * The label a target's spending is matched against. Transactions store the
 * category as a label, and a rename updates the live category before the
 * cached label catches up, so the live one wins (same rule as TargetsList).
 */
export function targetLabel(
  target: CategoryTarget,
  customCategories: CustomCategory[] = [],
) {
  return (
    findCategoryByKey(target.categoryKey, customCategories)?.label ??
    target.categoryLabel
  );
}

/** Expense totals per category label for one "YYYY-MM" month. */
export function spentByLabelForMonth(
  transactions: Transaction[],
  month: string,
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const t of transactions) {
    if (t.type !== "expense") continue;
    if (toMonthKey(new Date(t.createdAt)) !== month) continue;
    map[t.category] = (map[t.category] ?? 0) + t.amount;
  }
  return map;
}

function thresholdFor(spent: number, cap: number): BudgetThreshold | null {
  if (cap <= 0) return null;
  const ratio = (spent / cap) * 100;
  let reached: BudgetThreshold | null = null;
  for (const threshold of BUDGET_ALERT_THRESHOLDS) {
    if (ratio >= threshold) reached = threshold;
  }
  return reached;
}

/**
 * Every target's standing for a month, most urgent first (highest percent).
 * Pass `spentByLabel` when the caller already has it, else `transactions`.
 */
export function computeBudgetStandings({
  targets,
  monthKey,
  transactions,
  spentByLabel,
  customCategories = [],
}: {
  targets: CategoryTarget[];
  monthKey: string;
  transactions?: Transaction[];
  spentByLabel?: Record<string, number>;
  customCategories?: CustomCategory[];
}): BudgetStanding[] {
  const spentMap =
    spentByLabel ?? spentByLabelForMonth(transactions ?? [], monthKey);

  return targets
    .map((target) => {
      const label = targetLabel(target, customCategories);
      const cap = resolveTargetAmount(target, monthKey);
      const spent = spentMap[label] ?? 0;
      return {
        categoryKey: target.categoryKey,
        categoryLabel: label,
        monthKey,
        spent,
        cap,
        percent: cap > 0 ? Math.round((spent / cap) * 100) : 0,
        threshold: thresholdFor(spent, cap),
      };
    })
    .sort((a, b) => b.percent - a.percent);
}

/** Only the standings at or past 80%, for the dashboard alert strip. */
export function findBudgetAlerts(
  args: Parameters<typeof computeBudgetStandings>[0],
): BudgetStanding[] {
  return computeBudgetStandings(args).filter((s) => s.threshold !== null);
}

/**
 * Months whose expense spending a save could have changed: every month that
 * holds an added, removed or edited expense. Comparing whole lists (rather
 * than taking "the new transaction") also covers edits that move an entry to
 * another month or category.
 */
function changedMonths(before: Transaction[], after: Transaction[]) {
  const months = new Set<string>();
  const beforeById = new Map(before.map((t) => [t.id, t]));
  const afterIds = new Set<string>();

  for (const t of after) {
    afterIds.add(t.id);
    const prev = beforeById.get(t.id);
    if (
      prev &&
      prev.type === t.type &&
      prev.category === t.category &&
      prev.amount === t.amount &&
      prev.createdAt === t.createdAt
    ) {
      continue;
    }
    if (t.type === "expense") months.add(toMonthKey(new Date(t.createdAt)));
    if (prev?.type === "expense") months.add(toMonthKey(new Date(prev.createdAt)));
  }
  for (const t of before) {
    if (!afterIds.has(t.id) && t.type === "expense") {
      months.add(toMonthKey(new Date(t.createdAt)));
    }
  }
  return months;
}

/**
 * The thresholds a save pushed categories across.
 *
 * Call it right after saving a transaction with the ledger before and after
 * the save (see `applySavedTransaction` to build `after`). A crossing is
 * reported only when the category was below the threshold before and at or
 * past it after, so re-saving an entry in an already-over category stays
 * quiet. Each category reports only its highest threshold crossed.
 *
 * `monthKey` limits the check to one "YYYY-MM" month; by default every month
 * the save touched is checked, which is what a backdated entry needs.
 */
export function findBudgetCrossings({
  before,
  after,
  targets,
  monthKey,
  customCategories = [],
}: {
  before: Transaction[];
  after: Transaction[];
  targets: CategoryTarget[];
  monthKey?: string;
  customCategories?: CustomCategory[];
}): BudgetCrossing[] {
  if (targets.length === 0) return [];

  const months = monthKey ? [monthKey] : [...changedMonths(before, after)];
  const crossings: BudgetCrossing[] = [];

  for (const month of months) {
    const spentBefore = spentByLabelForMonth(before, month);
    const spentAfter = spentByLabelForMonth(after, month);

    for (const target of targets) {
      const label = targetLabel(target, customCategories);
      const cap = resolveTargetAmount(target, month);
      if (cap <= 0) continue;

      const was = ((spentBefore[label] ?? 0) / cap) * 100;
      const spent = spentAfter[label] ?? 0;
      const now = (spent / cap) * 100;

      let crossed: BudgetThreshold | null = null;
      for (const threshold of BUDGET_ALERT_THRESHOLDS) {
        if (was < threshold && now >= threshold) crossed = threshold;
      }
      if (crossed === null) continue;

      crossings.push({
        categoryKey: target.categoryKey,
        categoryLabel: label,
        monthKey: month,
        threshold: crossed,
        percent: Math.round(now),
        spent,
        cap,
      });
    }
  }

  return crossings.sort((a, b) => b.percent - a.percent);
}

/**
 * The ledger after saving `saved`: replaces the entry with the same id (an
 * edit) or appends it (a new entry). Handy for building `after` before the
 * provider's state has updated.
 */
export function applySavedTransaction(
  transactions: Transaction[],
  saved: Transaction,
): Transaction[] {
  let replaced = false;
  const next = transactions.map((t) => {
    if (t.id !== saved.id) return t;
    replaced = true;
    return saved;
  });
  return replaced ? next : [...next, saved];
}

/** Toast copy for a crossing, e.g. "Grocery & Food is at 92% of ৳10,000". */
export function formatBudgetCrossing(crossing: BudgetCrossing) {
  const { categoryLabel, percent, cap, spent, threshold } = crossing;
  if (threshold === 100) {
    return spent > cap
      ? `${categoryLabel} is over budget: ${formatCurrency(spent)} of ${formatCurrency(cap)}`
      : `${categoryLabel} has hit its ${formatCurrency(cap)} budget`;
  }
  return `${categoryLabel} is at ${percent}% of ${formatCurrency(cap)}`;
}
