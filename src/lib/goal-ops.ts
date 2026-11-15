/**
 * Pure goal operations, shared by the browser-storage hook, the
 * server-backed hook and the server itself, so all three produce exactly the
 * same goals. The server re-validates everything it receives (see
 * src/server/goals.ts).
 */
import {
  nextGoalOrder,
  sortGoalsByPriority,
  type Goal,
  type GoalCompletion,
  type GoalCompletionSource,
  type GoalPriceChange,
} from "@/lib/goals";
import { createId } from "@/lib/id";

/** Older price changes are dropped past this, keeping the original price. */
export const MAX_PRICE_HISTORY = 20;

/** The fields a goal can be edited by. */
export type GoalPatch = Partial<
  Pick<
    Goal,
    "label" | "targetAmount" | "iconKey" | "targetDate" | "links" | "imageId" | "status" | "order"
  >
>;

export interface NewGoal {
  label: string;
  targetAmount: number;
  iconKey?: string;
  targetDate?: number;
  links?: string[];
  imageId?: string;
}

export interface NewGoalCompletion {
  goalId: string;
  source: GoalCompletionSource;
  amount: number;
  transactionId?: string;
}

/* ------------------------------------------------------------------ */
/* Sanitizing stored data                                              */
/* ------------------------------------------------------------------ */

/** Keeps well-formed entries; drops the field when nothing valid is left. */
export function sanitizePriceHistory(value: unknown): GoalPriceChange[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const history = value.filter(
    (entry): entry is GoalPriceChange =>
      !!entry &&
      typeof entry === "object" &&
      typeof entry.amount === "number" &&
      Number.isFinite(entry.amount) &&
      entry.amount > 0 &&
      typeof entry.changedAt === "number" &&
      Number.isFinite(entry.changedAt),
  );
  return history.length
    ? history.map(({ amount, changedAt }) => ({ amount, changedAt }))
    : undefined;
}

export function sanitizeGoals(parsed: unknown): Goal[] {
  if (!Array.isArray(parsed)) return [];

  const goals: Goal[] = [];
  for (const entry of parsed) {
    if (!entry || typeof entry !== "object") continue;

    const value = entry as Partial<Goal>;
    if (typeof value.id !== "string" || !value.id) continue;
    if (typeof value.label !== "string" || !value.label.trim()) continue;
    if (
      typeof value.targetAmount !== "number" ||
      !Number.isFinite(value.targetAmount) ||
      value.targetAmount <= 0
    ) {
      continue;
    }

    const status =
      value.status === "completed" || value.status === "archived" ? value.status : "active";

    goals.push({
      id: value.id,
      label: value.label.trim(),
      targetAmount: value.targetAmount,
      iconKey: typeof value.iconKey === "string" ? value.iconKey : undefined,
      targetDate: typeof value.targetDate === "number" ? value.targetDate : undefined,
      links: Array.isArray(value.links)
        ? value.links.filter((link): link is string => typeof link === "string" && !!link)
        : undefined,
      imageId: typeof value.imageId === "string" ? value.imageId : undefined,
      order:
        typeof value.order === "number" && Number.isFinite(value.order) ? value.order : undefined,
      priceHistory: sanitizePriceHistory(value.priceHistory),
      status,
      createdAt: typeof value.createdAt === "number" ? value.createdAt : Date.now(),
      updatedAt: typeof value.updatedAt === "number" ? value.updatedAt : Date.now(),
    });
  }

  // Goals saved before priorities existed have no order. Give them one
  // after any ordered goals, oldest first, so the list has a stable order
  // to start reordering from.
  if (goals.some((goal) => goal.order === undefined)) {
    let next = nextGoalOrder(goals);
    for (const goal of sortGoalsByPriority(goals)) {
      if (goal.order === undefined) goal.order = next++;
    }
  }
  return goals;
}

export function sanitizeCompletions(parsed: unknown): GoalCompletion[] {
  if (!Array.isArray(parsed)) return [];

  const completions: GoalCompletion[] = [];
  for (const entry of parsed) {
    if (!entry || typeof entry !== "object") continue;

    const value = entry as Partial<GoalCompletion>;
    if (typeof value.id !== "string" || !value.id) continue;
    if (typeof value.goalId !== "string" || !value.goalId) continue;
    if (value.source !== "savings" && value.source !== "gift") continue;
    if (typeof value.amount !== "number" || !Number.isFinite(value.amount) || value.amount <= 0) {
      continue;
    }

    completions.push({
      id: value.id,
      goalId: value.goalId,
      source: value.source,
      amount: value.amount,
      transactionId: typeof value.transactionId === "string" ? value.transactionId : undefined,
      createdAt: typeof value.createdAt === "number" ? value.createdAt : Date.now(),
    });
  }
  return completions;
}

/* ------------------------------------------------------------------ */
/* Changes                                                             */
/* ------------------------------------------------------------------ */

/**
 * A new active goal with a client-made id, at the back of the queue. Making
 * the id on the client lets callers use the goal straight away.
 */
export function createGoal(input: NewGoal, existing: Pick<Goal, "order">[], now = Date.now()): Goal {
  return {
    id: createId(),
    // New goals join the end of the queue.
    order: nextGoalOrder(existing),
    label: input.label.trim(),
    targetAmount: input.targetAmount,
    iconKey: input.iconKey || undefined,
    targetDate: input.targetDate,
    links: input.links?.length ? input.links : undefined,
    imageId: input.imageId,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
}

export function createCompletion(input: NewGoalCompletion, now = Date.now()): GoalCompletion {
  return {
    id: createId(),
    goalId: input.goalId,
    source: input.source,
    amount: input.amount,
    transactionId: input.transactionId,
    createdAt: now,
  };
}

/**
 * Applies an edit. A new price records the old one, so the card can show how
 * the price moved since the goal was added.
 */
export function applyGoalPatch(goal: Goal, patch: GoalPatch, now = Date.now()): Goal {
  let priceHistory = goal.priceHistory;
  if (patch.targetAmount !== undefined && patch.targetAmount !== goal.targetAmount) {
    const all = [...(goal.priceHistory ?? []), { amount: goal.targetAmount, changedAt: now }];
    priceHistory =
      all.length > MAX_PRICE_HISTORY
        ? [all[0], ...all.slice(all.length - MAX_PRICE_HISTORY + 1)]
        : all;
  }
  return { ...goal, ...patch, priceHistory, updatedAt: now };
}

/**
 * Sets the priority order: `orderedIds[0]` comes first. Goals not in the
 * list (completed ones, say) keep their order.
 */
export function applyReorder(goals: Goal[], orderedIds: string[]) {
  const position = new Map(orderedIds.map((id, index) => [id, index]));
  return goals.map((goal) => {
    const order = position.get(goal.id);
    return order === undefined || order === goal.order ? goal : { ...goal, order };
  });
}

export function applyComplete(goals: Goal[], goalId: string, now = Date.now()) {
  return goals.map((goal) =>
    goal.id === goalId ? { ...goal, status: "completed" as const, updatedAt: now } : goal,
  );
}

/**
 * Re-opens a completed goal at the back of the queue, so it can't silently
 * jump ahead of goals the user has since put in order. Its completion
 * records are dropped by the caller.
 */
export function applyReopen(goals: Goal[], id: string, now = Date.now()) {
  const order = nextGoalOrder(goals);
  return goals.map((goal) =>
    goal.id === id ? { ...goal, status: "active" as const, order, updatedAt: now } : goal,
  );
}
