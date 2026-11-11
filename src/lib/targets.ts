/**
 * A spending limit for one expense category in one month.
 *
 * The category is referenced by its immutable `key` (a built-in key like
 * "grocery", or "custom-<id>"), so the target survives a rename. The label
 * is cached as well because transactions store the category as a mutable
 * label string, and the label is what spending is matched against.
 */
export interface CategoryTarget {
  /** Immutable category key. Never changes, even when the label is renamed. */
  categoryKey: string;
  /** Label captured at write time, kept in sync by the rename migration. */
  categoryLabel: string;
  /**
   * The cap set when the target was created. It applies to every month
   * before the first value in `overrides`. Always greater than zero.
   */
  amount: number;
  /**
   * Monthly values keyed by "YYYY-MM". Changing a target saves the new value
   * for the current month; a month without its own value carries forward the
   * most recent earlier month's value (see `resolveTargetAmount`).
   */
  overrides: Record<string, number>;
  createdAt: number;
  updatedAt: number;
}

export type TargetStatus = "on-track" | "reached" | "over";

export const TARGET_STATUS_META: Record<
  TargetStatus,
  { label: string; tone: "neutral" | "positive" | "warning"; bar: string }
> = {
  "on-track": {
    label: "On track",
    tone: "neutral",
    bar: "bg-foreground",
  },
  reached: {
    label: "Target reached",
    tone: "positive",
    bar: "bg-emerald-400",
  },
  over: {
    label: "Over target",
    tone: "warning",
    bar: "bg-rose-400",
  },
};

/** "YYYY-MM" for a date, used to key per-month overrides. */
export function monthKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function isMonthKey(value: string) {
  return /^\d{4}-\d{2}$/.test(value);
}

function isValidAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/**
 * The month whose saved value applies to `month`: that month itself if it
 * has one, otherwise the most recent earlier month that does. Null when no
 * month on or before it has a value, so the creation-time `amount` applies.
 * "YYYY-MM" keys sort chronologically as plain strings.
 */
export function targetValueMonth(target: CategoryTarget, month: string): string | null {
  let best: string | null = null;
  for (const [key, value] of Object.entries(target.overrides)) {
    if (!isMonthKey(key) || key > month || !isValidAmount(value)) continue;
    if (best === null || key > best) best = key;
  }
  return best;
}

/**
 * The cap for a given month: its own saved value, else the most recent
 * earlier month's value carried forward, else the creation-time amount.
 */
export function resolveTargetAmount(target: CategoryTarget, month: string) {
  const source = targetValueMonth(target, month);
  return source ? target.overrides[source] : target.amount;
}

export function computeTargetStatus(
  spent: number,
  target: number,
): TargetStatus {
  if (target <= 0) return "on-track";
  if (spent > target) return "over";
  if (spent >= target) return "reached";
  return "on-track";
}

export function computeTargetProgress(spent: number, target: number) {
  if (target <= 0) return 0;
  if (spent <= 0) return 0;
  return Math.min(spent / target, 1);
}

/** How much is left before the cap is hit. Negative when over target. */
export function computeTargetRemaining(spent: number, target: number) {
  return target - spent;
}
