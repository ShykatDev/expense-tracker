import { computeTotals, type Transaction } from "@/lib/transactions";

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
  /** Product pages the user bookmarked for this goal (full URLs). */
  links?: string[];
  /** Id of the goal's photo in IndexedDB (see lib/goal-images). */
  imageId?: string;
  /**
   * Priority among goals: lower comes first. Active goals are listed and
   * planned in this order, on the assumption that the top goal is bought
   * first. Goals saved before priorities existed get one when loaded.
   */
  order?: number;
  /**
   * Earlier target prices, oldest first. Each entry is a price the goal used
   * to have and when it was replaced, so prices people watch (sales, price
   * hikes) can be compared against what they first saw.
   */
  priceHistory?: GoalPriceChange[];
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

export interface GoalPriceChange {
  /** The price before the change. */
  amount: number;
  /** When it was replaced by the next price (epoch ms). */
  changedAt: number;
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

/**
 * Turns what the user typed into a usable URL, adding "https://" when the
 * scheme is missing. Returns null for anything that isn't a web address.
 */
export function normalizeGoalLink(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.href;
  } catch {
    return null;
  }
}

/** "https://www.daraz.com.bd/products/..." → "daraz.com.bd". */
export function goalLinkLabel(href: string) {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return href;
  }
}

/** Active goals in the user's priority order (ties: oldest first). */
export function sortGoalsByPriority<T extends Pick<Goal, "order" | "createdAt">>(goals: T[]) {
  return [...goals].sort(
    (a, b) =>
      (a.order ?? Number.POSITIVE_INFINITY) - (b.order ?? Number.POSITIVE_INFINITY) ||
      a.createdAt - b.createdAt,
  );
}

/** The `order` that puts a goal after every existing one. */
export function nextGoalOrder(goals: Pick<Goal, "order">[]) {
  let max = -1;
  for (const goal of goals) {
    if (typeof goal.order === "number" && goal.order > max) max = goal.order;
  }
  return max + 1;
}

/**
 * Every price the goal has had, oldest first, each with the day it became
 * the price. The last entry is the current price.
 */
export function goalPriceTimeline(goal: Pick<Goal, "targetAmount" | "priceHistory" | "createdAt">) {
  const history = goal.priceHistory ?? [];
  const timeline = history.map((entry, index) => ({
    amount: entry.amount,
    since: index === 0 ? goal.createdAt : history[index - 1].changedAt,
  }));
  timeline.push({
    amount: goal.targetAmount,
    since: history.length ? history[history.length - 1].changedAt : goal.createdAt,
  });
  return timeline;
}

/**
 * Current price minus the price the goal was added at: negative when it got
 * cheaper. Zero when the price never changed (or came back to where it was).
 */
export function goalPriceDelta(goal: Pick<Goal, "targetAmount" | "priceHistory">) {
  const first = goal.priceHistory?.[0];
  return first ? goal.targetAmount - first.amount : 0;
}

export interface SavingsPace {
  /** Average income minus expense per month. Can be zero or negative. */
  average: number;
  /** How many months the average is based on. */
  months: number;
}

/**
 * Average monthly savings over the most recent complete months that have
 * any transactions (up to `maxMonths`, looking back at most a year).
 *
 * The current month is left out because it is still in progress: half a
 * month of income with a full month of rent ahead would skew the pace.
 * Months with nothing logged are skipped rather than counted as zero, since
 * they usually mean the app wasn't used, not that nothing was saved.
 * Returns null when there is no complete month to go on.
 */
export function computeSavingsPace(
  transactions: Transaction[],
  now = Date.now(),
  maxMonths = 6,
): SavingsPace | null {
  const today = new Date(now);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
  const lookbackStart = new Date(today.getFullYear() - 1, today.getMonth(), 1).getTime();

  const byMonth = new Map<number, Transaction[]>();
  for (const t of transactions) {
    if (t.createdAt >= monthStart || t.createdAt < lookbackStart) continue;
    const date = new Date(t.createdAt);
    const key = date.getFullYear() * 12 + date.getMonth();
    const list = byMonth.get(key);
    if (list) list.push(t);
    else byMonth.set(key, [t]);
  }

  const recent = [...byMonth.keys()].sort((a, b) => b - a).slice(0, maxMonths);
  if (recent.length === 0) return null;

  const total = recent.reduce(
    (sum, key) => sum + computeTotals(byMonth.get(key) ?? []).balance,
    0,
  );
  return { average: total / recent.length, months: recent.length };
}

export type GoalEstimate =
  /** Savings already cover it: no estimate needed. */
  | { kind: "ready" }
  /** No complete month logged yet, so there is no pace to go on. */
  | { kind: "no-history" }
  /** The average month isn't saving anything, so it never arrives. */
  | { kind: "not-saving" }
  /** Months from now until it's affordable, and the date that lands on. */
  | { kind: "eta"; months: number; date: number };

const AVERAGE_MONTH_MS = 30.436875 * 86_400_000;

/**
 * When each active goal becomes affordable if saving continues at `pace`.
 *
 * Goals are taken in priority order and assumed to be bought one after the
 * other, so goal k has to wait for the cumulative price of goals 1..k, less
 * what is already saved. A goal the current savings already cover is
 * "ready" regardless of its place in the queue, matching its card.
 */
export function estimateGoalDates(
  goalsInPriorityOrder: Pick<Goal, "id" | "status" | "targetAmount">[],
  savings: number,
  pace: SavingsPace | null,
  now = Date.now(),
) {
  const estimates = new Map<string, GoalEstimate>();
  let cumulative = 0;
  for (const goal of goalsInPriorityOrder) {
    cumulative += goal.targetAmount;
    if (isGoalFunded(goal, savings)) {
      estimates.set(goal.id, { kind: "ready" });
    } else if (!pace) {
      estimates.set(goal.id, { kind: "no-history" });
    } else if (pace.average <= 0) {
      estimates.set(goal.id, { kind: "not-saving" });
    } else {
      const months = Math.max(cumulative - savings, 0) / pace.average;
      estimates.set(goal.id, {
        kind: "eta",
        months,
        date: now + months * AVERAGE_MONTH_MS,
      });
    }
  }
  return estimates;
}

/** "under a month", "~4 months", "~2.5 years", "50+ years". */
export function formatEstimateDuration(months: number) {
  if (months < 1) return "under a month";
  if (months < 12) {
    const whole = Math.ceil(months);
    return `~${whole} ${whole === 1 ? "month" : "months"}`;
  }
  const years = months / 12;
  if (years >= 50) return "50+ years";
  const rounded = Math.round(years * 2) / 2;
  return `~${rounded} ${rounded === 1 ? "year" : "years"}`;
}

/**
 * How far off a goal is, from its estimated date: short term within two
 * months, mid term within six, long term within a year, and next year beyond
 * that. A goal savings already cover is short term. "unknown" when there is
 * no estimate to go on.
 */
export type GoalHorizon = "short" | "mid" | "long" | "next-year" | "unknown";

const SHORT_TERM_MONTHS = 2;
const MID_TERM_MONTHS = 6;
const LONG_TERM_MONTHS = 12;

export function goalHorizon(estimate: GoalEstimate | undefined): GoalHorizon {
  if (!estimate) return "unknown";
  if (estimate.kind === "ready") return "short";
  if (estimate.kind !== "eta") return "unknown";
  if (estimate.months <= SHORT_TERM_MONTHS) return "short";
  if (estimate.months <= MID_TERM_MONTHS) return "mid";
  if (estimate.months <= LONG_TERM_MONTHS) return "long";
  return "next-year";
}

/** Display order and copy for each horizon. */
export const GOAL_HORIZONS: {
  value: GoalHorizon;
  label: string;
  short: string;
  hint: string;
}[] = [
  { value: "short", label: "Short term", short: "short", hint: "Within 2 months" },
  { value: "mid", label: "Mid term", short: "mid", hint: "2–6 months" },
  { value: "long", label: "Long term", short: "long", hint: "6–12 months" },
  { value: "next-year", label: "Next year", short: "next year", hint: "12+ months" },
  { value: "unknown", label: "No estimate yet", short: "unsure", hint: "Needs a saving pace" },
];
