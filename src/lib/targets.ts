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
  /** Recurring monthly cap. Always greater than zero. */
  amount: number;
  /**
   * Per-month overrides keyed by "YYYY-MM". A month with an override uses
   * that value instead of the recurring `amount`, so December can be more
   * expensive without duplicating the whole target.
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

/** The cap that applies to a given month, honouring per-month overrides. */
export function resolveTargetAmount(target: CategoryTarget, month: string) {
  const override = target.overrides[month];
  if (typeof override === "number" && Number.isFinite(override) && override > 0) {
    return override;
  }
  return target.amount;
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
