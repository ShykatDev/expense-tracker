import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { getDb, schema } from "@/db";
import {
  isTransactionType,
  normalizeIconKey,
  type CustomCategories,
  type CustomCategoryPatch,
  type HiddenCategories,
} from "@/lib/categories-ops";
import type { CustomCategory, TransactionType } from "@/lib/transactions";

const { customCategories, hiddenCategories } = schema;

const MAX_LABEL = 60;
const MAX_KEY = 120;
/** Generous caps, so one request can't fill the table. */
const MAX_CUSTOM = 500;
const MAX_HIDDEN = 1000;

/* ------------------------------------------------------------------ */
/* Validation: never trust what the browser sends                      */
/* ------------------------------------------------------------------ */

function text(value: unknown, max: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= max ? trimmed : null;
}

/** A custom category from the client, cleaned, or null when invalid. */
function cleanCustomCategory(raw: unknown): CustomCategory | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const id = text(value.id, 100);
  const key = text(value.key, MAX_KEY);
  const label = text(value.label, MAX_LABEL);
  if (!id || !key || !label || !isTransactionType(value.type)) return null;
  const createdAt =
    typeof value.createdAt === "number" && Number.isFinite(value.createdAt) && value.createdAt > 0
      ? Math.round(value.createdAt)
      : // Older local data may lack it; any stable time keeps the order sane.
        Date.now();
  return { id, key, type: value.type, label, iconKey: normalizeIconKey(value.iconKey), createdAt };
}

/** A patch from the client, cleaned. Unknown or invalid fields are dropped. */
function cleanPatch(raw: CustomCategoryPatch) {
  const set: Partial<typeof customCategories.$inferInsert> = {};
  if (!raw || typeof raw !== "object") return set;
  if (raw.label !== undefined) {
    const label = text(raw.label, MAX_LABEL);
    if (label) set.label = label;
  }
  if (raw.iconKey !== undefined) set.iconKey = normalizeIconKey(raw.iconKey);
  if (raw.type !== undefined && isTransactionType(raw.type)) set.type = raw.type;
  return set;
}

/* ------------------------------------------------------------------ */
/* Queries — every one is scoped to the signed-in user                 */
/* ------------------------------------------------------------------ */

type Row = typeof customCategories.$inferSelect;

function toClient(row: Row): CustomCategory {
  return {
    id: row.id,
    key: row.key,
    type: row.type,
    label: row.label,
    iconKey: row.iconKey,
    createdAt: row.createdAt,
  };
}

/** Custom categories grouped by type, plus the hidden keys per type. */
export async function listCategories(
  userId: string,
): Promise<{ custom: CustomCategories; hidden: HiddenCategories }> {
  const db = getDb();
  const [rows, hiddenRows] = await Promise.all([
    db
      .select()
      .from(customCategories)
      .where(eq(customCategories.userId, userId))
      .orderBy(asc(customCategories.createdAt), asc(customCategories.id)),
    db.select().from(hiddenCategories).where(eq(hiddenCategories.userId, userId)),
  ]);
  const custom: CustomCategories = { income: [], expense: [] };
  for (const row of rows) custom[row.type].push(toClient(row));
  const hidden: HiddenCategories = { income: [], expense: [] };
  for (const row of hiddenRows) hidden[row.type].push(row.categoryKey);
  return { custom, hidden };
}

/**
 * Inserts custom categories, skipping ids that already exist, so a retried
 * save or a second import never duplicates one. Returns how many were new.
 */
export async function insertCustomCategories(userId: string, raw: unknown[]) {
  if (!Array.isArray(raw)) return 0;
  const rows = raw
    .slice(0, MAX_CUSTOM)
    .map(cleanCustomCategory)
    .filter((c): c is CustomCategory => c !== null)
    .map((c) => ({ ...c, userId }));
  if (rows.length === 0) return 0;
  const result = await getDb()
    .insert(customCategories)
    .values(rows)
    .onConflictDoNothing({ target: customCategories.id })
    .returning({ id: customCategories.id });
  return result.length;
}

export async function updateCustomCategory(userId: string, id: string, patch: CustomCategoryPatch) {
  const set = cleanPatch(patch);
  if (typeof id !== "string" || Object.keys(set).length === 0) return;
  await getDb()
    .update(customCategories)
    .set(set)
    .where(and(eq(customCategories.userId, userId), eq(customCategories.id, id)));
}

export async function deleteCustomCategory(userId: string, id: string) {
  if (typeof id !== "string") return;
  await getDb()
    .delete(customCategories)
    .where(and(eq(customCategories.userId, userId), eq(customCategories.id, id)));
}

/**
 * Sets (not toggles) one category's hidden flag, so a repeated request
 * lands on the same state instead of flipping it back.
 */
export async function setHidden(
  userId: string,
  type: TransactionType,
  key: string,
  isHidden: boolean,
) {
  const categoryKey = text(key, MAX_KEY);
  if (!isTransactionType(type) || !categoryKey || typeof isHidden !== "boolean") return;
  const db = getDb();
  if (isHidden) {
    await db
      .insert(hiddenCategories)
      .values({ userId, type, categoryKey })
      .onConflictDoNothing();
  } else {
    await db
      .delete(hiddenCategories)
      .where(
        and(
          eq(hiddenCategories.userId, userId),
          eq(hiddenCategories.type, type),
          eq(hiddenCategories.categoryKey, categoryKey),
        ),
      );
  }
}

/** Adds hidden keys from an import; ones already hidden are skipped. */
export async function insertHidden(userId: string, raw: unknown) {
  if (!raw || typeof raw !== "object") return 0;
  const value = raw as Record<string, unknown>;
  const rows: (typeof hiddenCategories.$inferInsert)[] = [];
  const seen = new Set<string>();
  for (const type of ["income", "expense"] as const) {
    const list = value[type];
    if (!Array.isArray(list)) continue;
    for (const entry of list) {
      const categoryKey = text(entry, MAX_KEY);
      if (!categoryKey || seen.has(`${type}:${categoryKey}`)) continue;
      seen.add(`${type}:${categoryKey}`);
      rows.push({ userId, type, categoryKey });
    }
  }
  if (rows.length === 0) return 0;
  const result = await getDb()
    .insert(hiddenCategories)
    .values(rows.slice(0, MAX_HIDDEN))
    .onConflictDoNothing()
    .returning({ key: hiddenCategories.categoryKey });
  return result.length;
}

export async function deleteAllCategories(userId: string) {
  const db = getDb();
  await db.delete(customCategories).where(eq(customCategories.userId, userId));
  await db.delete(hiddenCategories).where(eq(hiddenCategories.userId, userId));
}
