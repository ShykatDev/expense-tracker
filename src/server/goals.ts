import "server-only";

import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { getDb, schema } from "@/db";
import {
  MAX_PRICE_HISTORY,
  applyGoalPatch,
  sanitizePriceHistory,
  type GoalPatch,
} from "@/lib/goal-ops";
import {
  nextGoalOrder,
  normalizeGoalLink,
  type Goal,
  type GoalCompletion,
  type GoalPriceChange,
} from "@/lib/goals";

const { goals, goalCompletions } = schema;

/** Rows per insert, so a big import stays well under request limits. */
const CHUNK = 500;
const MAX_AMOUNT = 1e12;
const MAX_TEXT = 120;
const MAX_ID = 100;
const MAX_LINKS = 20;
const MAX_LINK_LENGTH = 2048;
/** Postgres `integer`, with plenty of room left for new goals. */
const MAX_ORDER = 1_000_000_000;
/** More goals than anyone will reorder at once; caps the size of one update. */
const MAX_REORDER = 1000;

/* ------------------------------------------------------------------ */
/* Validation: never trust what the browser sends                      */
/* ------------------------------------------------------------------ */

function text(value: unknown, max = MAX_TEXT) {
  return typeof value === "string" && value.trim() && value.length <= max ? value : null;
}

function amount(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value < MAX_AMOUNT
    ? Math.round(value * 100) / 100
    : null;
}

function millis(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.round(value) : null;
}

function order(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value < MAX_ORDER
    ? Math.round(value)
    : null;
}

function isStatus(value: unknown): value is Goal["status"] {
  return value === "active" || value === "completed" || value === "archived";
}

/** Only real web addresses, normalized the way the goal dialog saves them. */
function links(value: unknown) {
  if (!Array.isArray(value)) return null;
  const clean = value
    .filter((link): link is string => typeof link === "string" && link.length <= MAX_LINK_LENGTH)
    .map(normalizeGoalLink)
    .filter((link): link is string => link !== null)
    .slice(0, MAX_LINKS);
  return clean.length ? clean : null;
}

function priceHistory(value: unknown): GoalPriceChange[] | null {
  const history = sanitizePriceHistory(value)
    ?.filter((entry) => amount(entry.amount) !== null && millis(entry.changedAt) !== null)
    .map((entry) => ({ amount: amount(entry.amount)!, changedAt: millis(entry.changedAt)! }));
  if (!history?.length) return null;
  // Same trimming as a price edit: keep the original price, drop the middle.
  return history.length > MAX_PRICE_HISTORY
    ? [history[0], ...history.slice(history.length - MAX_PRICE_HISTORY + 1)]
    : history;
}

/** A full goal from the client, cleaned, or null when invalid. */
export function cleanGoal(raw: unknown): Goal | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const id = text(value.id, MAX_ID);
  const label = text(value.label);
  const target = amount(value.targetAmount);
  if (!id || !label || target === null) return null;

  const now = Date.now();
  const goal: Goal = {
    id,
    label: label.trim(),
    targetAmount: target,
    status: isStatus(value.status) ? value.status : "active",
    createdAt: millis(value.createdAt) ?? now,
    updatedAt: millis(value.updatedAt) ?? now,
  };
  const iconKey = text(value.iconKey, MAX_ID);
  if (iconKey) goal.iconKey = iconKey;
  const targetDate = millis(value.targetDate);
  if (targetDate !== null) goal.targetDate = targetDate;
  const goalLinks = links(value.links);
  if (goalLinks) goal.links = goalLinks;
  const imageId = text(value.imageId, MAX_ID);
  if (imageId) goal.imageId = imageId;
  const goalOrder = order(value.order);
  if (goalOrder !== null) goal.order = goalOrder;
  const history = priceHistory(value.priceHistory);
  if (history) goal.priceHistory = history;
  return goal;
}

/**
 * A patch from the client, cleaned. Unknown or invalid fields are dropped;
 * an optional field sent as undefined (a removed photo, a cleared deadline)
 * is kept as undefined so it gets cleared.
 */
function cleanPatch(raw: unknown): GoalPatch {
  if (!raw || typeof raw !== "object") return {};
  const value = raw as Record<string, unknown>;
  const patch: GoalPatch = {};
  const label = text(value.label);
  if (label) patch.label = label.trim();
  const target = amount(value.targetAmount);
  if (target !== null) patch.targetAmount = target;
  if (isStatus(value.status)) patch.status = value.status;
  if ("iconKey" in value) patch.iconKey = text(value.iconKey, MAX_ID) ?? undefined;
  if ("targetDate" in value) patch.targetDate = millis(value.targetDate) ?? undefined;
  if ("links" in value) patch.links = links(value.links) ?? undefined;
  if ("imageId" in value) patch.imageId = text(value.imageId, MAX_ID) ?? undefined;
  if ("order" in value) {
    const goalOrder = order(value.order);
    if (goalOrder !== null) patch.order = goalOrder;
  }
  return patch;
}

/** A completion from the client, cleaned, or null when invalid. */
export function cleanCompletion(raw: unknown): GoalCompletion | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const id = text(value.id, MAX_ID);
  const goalId = text(value.goalId, MAX_ID);
  const sum = amount(value.amount);
  if (!id || !goalId || sum === null) return null;
  if (value.source !== "savings" && value.source !== "gift") return null;

  const completion: GoalCompletion = {
    id,
    goalId,
    source: value.source,
    amount: sum,
    createdAt: millis(value.createdAt) ?? Date.now(),
  };
  const transactionId = text(value.transactionId, MAX_ID);
  if (transactionId) completion.transactionId = transactionId;
  return completion;
}

/* ------------------------------------------------------------------ */
/* Mapping                                                             */
/* ------------------------------------------------------------------ */

type GoalRow = typeof goals.$inferSelect;
type CompletionRow = typeof goalCompletions.$inferSelect;

/** Null columns become missing fields, matching the client model. */
function goalToClient(row: GoalRow): Goal {
  const goal: Goal = {
    id: row.id,
    label: row.label,
    targetAmount: row.targetAmount,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
  if (row.iconKey) goal.iconKey = row.iconKey;
  if (row.targetDate !== null) goal.targetDate = row.targetDate;
  if (row.links?.length) goal.links = row.links;
  if (row.imageId) goal.imageId = row.imageId;
  if (row.order !== null) goal.order = row.order;
  if (row.priceHistory?.length) goal.priceHistory = row.priceHistory;
  return goal;
}

function goalToRow(userId: string, goal: Goal) {
  return {
    id: goal.id,
    userId,
    label: goal.label,
    targetAmount: goal.targetAmount,
    iconKey: goal.iconKey ?? null,
    targetDate: goal.targetDate ?? null,
    links: goal.links?.length ? goal.links : null,
    imageId: goal.imageId ?? null,
    order: goal.order ?? null,
    priceHistory: goal.priceHistory?.length ? goal.priceHistory : null,
    status: goal.status,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
  };
}

function completionToClient(row: CompletionRow): GoalCompletion {
  const completion: GoalCompletion = {
    id: row.id,
    goalId: row.goalId,
    source: row.source,
    amount: row.amount,
    createdAt: row.createdAt,
  };
  if (row.transactionId) completion.transactionId = row.transactionId;
  return completion;
}

/* ------------------------------------------------------------------ */
/* Queries — every one is scoped to the signed-in user                 */
/* ------------------------------------------------------------------ */

export async function listGoals(userId: string) {
  const db = getDb();
  const [goalRows, completionRows] = await Promise.all([
    db.select().from(goals).where(eq(goals.userId, userId)).orderBy(desc(goals.createdAt)),
    db
      .select()
      .from(goalCompletions)
      .where(eq(goalCompletions.userId, userId))
      .orderBy(desc(goalCompletions.createdAt)),
  ]);
  return { goals: goalRows.map(goalToClient), completions: completionRows.map(completionToClient) };
}

async function findGoal(userId: string, id: string) {
  const [row] = await getDb()
    .select()
    .from(goals)
    .where(and(eq(goals.userId, userId), eq(goals.id, id)))
    .limit(1);
  return row ? goalToClient(row) : null;
}

/**
 * Inserts goals, skipping ids that already exist, so a retried save or a
 * second import never duplicates anything. Returns how many rows were new.
 */
export async function insertGoals(userId: string, raw: unknown[]) {
  const rows = raw.map(cleanGoal).filter((g): g is Goal => g !== null);
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const result = await getDb()
      .insert(goals)
      .values(rows.slice(i, i + CHUNK).map((goal) => goalToRow(userId, goal)))
      .onConflictDoNothing({ target: goals.id })
      .returning({ id: goals.id });
    inserted += result.length;
  }
  return { inserted, skipped: raw.length - inserted };
}

/**
 * Inserts completions, skipping existing ids. Completions for goals that
 * aren't this user's (or no longer exist) are dropped: the goal id is a
 * foreign key, and it must never point at someone else's goal.
 */
export async function insertCompletions(userId: string, raw: unknown[]) {
  const rows = raw.map(cleanCompletion).filter((c): c is GoalCompletion => c !== null);
  if (rows.length === 0) return { inserted: 0, skipped: raw.length };

  const goalIds = [...new Set(rows.map((c) => c.goalId))];
  const owned = new Set<string>();
  for (let i = 0; i < goalIds.length; i += CHUNK) {
    const found = await getDb()
      .select({ id: goals.id })
      .from(goals)
      .where(and(eq(goals.userId, userId), inArray(goals.id, goalIds.slice(i, i + CHUNK))));
    for (const { id } of found) owned.add(id);
  }
  const valid = rows.filter((c) => owned.has(c.goalId));

  let inserted = 0;
  for (let i = 0; i < valid.length; i += CHUNK) {
    const result = await getDb()
      .insert(goalCompletions)
      .values(
        valid.slice(i, i + CHUNK).map((c) => ({
          ...c,
          transactionId: c.transactionId ?? null,
          userId,
        })),
      )
      .onConflictDoNothing({ target: goalCompletions.id })
      .returning({ id: goalCompletions.id });
    inserted += result.length;
  }
  return { inserted, skipped: raw.length - inserted };
}

/** Applies an edit with the same rules as the client (price history included). */
export async function updateGoal(userId: string, id: string, rawPatch: unknown) {
  const patch = cleanPatch(rawPatch);
  if (Object.keys(patch).length === 0) return;
  const goal = await findGoal(userId, id);
  if (!goal) return;
  const next = applyGoalPatch(goal, patch);
  const row = goalToRow(userId, next);
  await getDb()
    .update(goals)
    .set({
      label: row.label,
      targetAmount: row.targetAmount,
      iconKey: row.iconKey,
      targetDate: row.targetDate,
      links: row.links,
      imageId: row.imageId,
      order: row.order,
      priceHistory: row.priceHistory,
      status: row.status,
      updatedAt: row.updatedAt,
    })
    .where(and(eq(goals.userId, userId), eq(goals.id, id)));
}

/** Gives each listed goal its position as `order`, in a single update. */
export async function reorderGoals(userId: string, orderedIds: unknown) {
  if (!Array.isArray(orderedIds) || orderedIds.length > MAX_REORDER) return;
  const ids = orderedIds.filter((id): id is string => text(id, MAX_ID) !== null);
  if (ids.length !== orderedIds.length || new Set(ids).size !== ids.length) return;
  if (ids.length === 0) return;

  const cases = sql.join(
    ids.map((id, index) => sql`when ${id} then ${index}::integer`),
    sql` `,
  );
  await getDb()
    .update(goals)
    .set({ order: sql`case ${goals.id} ${cases} end` })
    .where(and(eq(goals.userId, userId), inArray(goals.id, ids)));
}

export async function completeGoal(userId: string, rawCompletion: unknown) {
  const completion = cleanCompletion(rawCompletion);
  if (!completion) return;
  // Marked completed even when the record already existed, so a retried
  // save still finishes the job.
  await insertCompletions(userId, [completion]);
  await getDb()
    .update(goals)
    .set({ status: "completed", updatedAt: Date.now() })
    .where(and(eq(goals.userId, userId), eq(goals.id, completion.goalId)));
}

/** Back to active at the end of the queue; its completion records go. */
export async function reopenGoal(userId: string, id: string) {
  const db = getDb();
  const orders = await db
    .select({ order: goals.order })
    .from(goals)
    .where(eq(goals.userId, userId));
  const next = nextGoalOrder(orders.map((row) => ({ order: row.order ?? undefined })));
  await db
    .update(goals)
    .set({ status: "active", order: next, updatedAt: Date.now() })
    .where(and(eq(goals.userId, userId), eq(goals.id, id)));
  await db
    .delete(goalCompletions)
    .where(and(eq(goalCompletions.userId, userId), eq(goalCompletions.goalId, id)));
}

/** Deletes a goal; its completions go with it (foreign key cascade). */
export async function deleteGoal(userId: string, id: string) {
  await getDb().delete(goals).where(and(eq(goals.userId, userId), eq(goals.id, id)));
}

export async function deleteAllGoals(userId: string) {
  const db = getDb();
  await db.delete(goalCompletions).where(eq(goalCompletions.userId, userId));
  await db.delete(goals).where(eq(goals.userId, userId));
}
