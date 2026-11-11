/**
 * A savings goal, e.g. "AirPods" at 30000 BDT.
 *
 * A goal is not a separate bucket of money: the user has one savings figure
 * (income minus expenses) and each goal measures how close that figure is to
 * affording the thing. So progress is `savings / targetAmount`.
 */
export interface Goal {
  id: string;
  /** Display name. */
  label: string;
  /** Target amount. Always greater than zero. */
  targetAmount: number;
  /** Optional icon key into the shared CATEGORY_ICONS registry. */
  iconKey?: string;
  /** Optional deadline (epoch ms). Drives the "days left" badge. */
  targetDate?: number;
  /**
   * "active" | "completed" | "archived".
   *
   * Completion is stored rather than derived, because reaching the target is
   * not the same as buying the thing: a goal stays active until the user
   * confirms they got it.
   */
  status: "active" | "completed" | "archived";
  createdAt: number;
  updatedAt: number;
}

/**
 * How a completed goal was fulfilled.
 *
 * "savings" — the user bought it with their own savings, so the amount was
 * recorded as an expense and the savings figure drops.
 *
 * "gift" — somebody gave it to them, so no savings were spent and nothing
 * was recorded against the ledger.
 */
export type GoalCompletionSource = "savings" | "gift";

export interface GoalCompletion {
  id: string;
  goalId: string;
  source: GoalCompletionSource;
  /** The goal's target amount. Kept for the history record. */
  amount: number;
  /** The transaction created for a "savings" completion. */
  transactionId?: string;
  createdAt: number;
}

/**
 * How close the savings figure is to affording the goal.
 *
 * Clamped to 1 so a goal that has been funded past its target still shows a
 * full bar, but the raw saved amount is returned separately so the UI can
 * show "over target".
 */
export function computeGoalProgress(savings: number, targetAmount: number) {
  if (targetAmount <= 0) return 0;
  if (savings <= 0) return 0;
  return Math.min(savings / targetAmount, 1);
}

export function computeGoalRemaining(savings: number, targetAmount: number) {
  return Math.max(targetAmount - savings, 0);
}

/**
 * True when the savings figure alone covers the goal.
 *
 * A goal that has already been completed stays completed even if spending
 * later dips the savings back below the target, so the caller passes the
 * goal's stored status in as well.
 */
export function isGoalFunded(
  goal: Pick<Goal, "status" | "targetAmount">,
  savings: number,
) {
  if (goal.status === "completed" || goal.status === "archived") return true;
  return goal.targetAmount > 0 && savings >= goal.targetAmount;
}

/** Whole days until a deadline. Negative once the deadline has passed. */
export function daysUntil(date: number) {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const target = new Date(date);
  const startOfTarget = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
  ).getTime();
  return Math.round((startOfTarget - startOfToday) / 86_400_000);
}
