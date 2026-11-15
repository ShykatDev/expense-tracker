import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";

import { getDb, schema } from "@/db";
import { cleanTargetOverrides, isMonthKey, type CategoryTarget } from "@/lib/targets";

const { categoryTargets } = schema;

/** Rows per insert, so a big import stays well under request limits. */
const CHUNK = 500;
const MAX_AMOUNT = 1e12;
const MAX_TEXT = 120;
/** Fifty years of months is far more than any real target will carry. */
const MAX_OVERRIDES = 600;

/* ------------------------------------------------------------------ */
/* Validation: never trust what the browser sends                      */
/* ------------------------------------------------------------------ */

function text(value: unknown, max = MAX_TEXT) {
  return typeof value === "string" && value.trim() && value.length <= max ? value.trim() : null;
}

function amount(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value < MAX_AMOUNT
    ? Math.round(value * 100) / 100
    : null;
}

function millis(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.round(value) : null;
}

function month(value: unknown) {
  return typeof value === "string" && isMonthKey(value) ? value : null;
}

/** Monthly values, cleaned, rounded and capped in number. */
function overrides(value: unknown) {
  const entries = Object.entries(cleanTargetOverrides(value))
    .map(([key, sum]) => [key, amount(sum)] as const)
    .filter((entry): entry is readonly [string, number] => entry[1] !== null)
    .slice(-MAX_OVERRIDES);
  return Object.fromEntries(entries) as Record<string, number>;
}

/** A full target from the client (an import), cleaned, or null when invalid. */
function cleanTarget(raw: unknown): CategoryTarget | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const categoryKey = text(value.categoryKey, 100);
  const categoryLabel = text(value.categoryLabel);
  const sum = amount(value.amount);
  if (!categoryKey || !categoryLabel || sum === null) return null;
  const now = Date.now();
  return {
    categoryKey,
    categoryLabel,
    amount: sum,
    overrides: overrides(value.overrides),
    createdAt: millis(value.createdAt) ?? now,
    updatedAt: millis(value.updatedAt) ?? now,
  };
}

/* ------------------------------------------------------------------ */
/* Queries — every one is scoped to the signed-in user                 */
/* ------------------------------------------------------------------ */

type Row = typeof categoryTargets.$inferSelect;

function toClient(row: Row): CategoryTarget {
  return {
    categoryKey: row.categoryKey,
    categoryLabel: row.categoryLabel,
    amount: row.amount,
    overrides: cleanTargetOverrides(row.overrides),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function byKey(userId: string, categoryKey: string) {
  return and(eq(categoryTargets.userId, userId), eq(categoryTargets.categoryKey, categoryKey));
}

/** Oldest first, matching the order the browser list grows in. */
export async function listTargets(userId: string) {
  const rows = await getDb()
    .select()
    .from(categoryTargets)
    .where(eq(categoryTargets.userId, userId))
    .orderBy(asc(categoryTargets.createdAt), asc(categoryTargets.categoryKey));
  return rows.map(toClient);
}

/**
 * Creates or replaces a category's target. createdAt survives a replace, and
 * the monthly values are only replaced when the client sends them.
 */
export async function upsertTarget(userId: string, raw: unknown) {
  if (!raw || typeof raw !== "object") return;
  const value = raw as Record<string, unknown>;
  const categoryKey = text(value.categoryKey, 100);
  const categoryLabel = text(value.categoryLabel);
  const sum = amount(value.amount);
  if (!categoryKey || !categoryLabel || sum === null) return;
  const hasOverrides = value.overrides !== undefined;
  const cleaned = overrides(value.overrides);
  const now = Date.now();

  await getDb()
    .insert(categoryTargets)
    .values({
      userId,
      categoryKey,
      categoryLabel,
      amount: sum,
      overrides: cleaned,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [categoryTargets.userId, categoryTargets.categoryKey],
      set: {
        categoryLabel,
        amount: sum,
        updatedAt: now,
        ...(hasOverrides ? { overrides: cleaned } : {}),
      },
    });
}

/**
 * Sets (or clears, with undefined) one month's value. Done in SQL on the
 * stored JSON, so two devices editing different months can't overwrite
 * each other's values.
 */
export async function setTargetOverride(
  userId: string,
  categoryKey: unknown,
  monthKey: unknown,
  value: unknown,
) {
  const key = text(categoryKey, 100);
  const m = month(monthKey);
  if (!key || !m) return;
  const now = Date.now();

  if (value === undefined || value === null) {
    await getDb()
      .update(categoryTargets)
      .set({ overrides: sql`${categoryTargets.overrides} - ${m}::text`, updatedAt: now })
      .where(byKey(userId, key));
    return;
  }

  const sum = amount(value);
  if (sum === null) return;
  await getDb()
    .update(categoryTargets)
    .set({
      overrides: sql`${categoryTargets.overrides} || jsonb_build_object(${m}::text, ${sum}::numeric)`,
      updatedAt: now,
    })
    .where(byKey(userId, key));
}

/** Keeps the cached label in step with a category rename. */
export async function renameTargetLabel(userId: string, categoryKey: unknown, label: unknown) {
  const key = text(categoryKey, 100);
  const categoryLabel = text(label);
  if (!key || !categoryLabel) return;
  await getDb()
    .update(categoryTargets)
    .set({ categoryLabel, updatedAt: Date.now() })
    .where(byKey(userId, key));
}

export async function deleteTarget(userId: string, categoryKey: unknown) {
  const key = text(categoryKey, 100);
  if (!key) return;
  await getDb().delete(categoryTargets).where(byKey(userId, key));
}

/**
 * Inserts targets, skipping categories that already have one. That keeps
 * the import idempotent and never overwrites a target set on another device.
 * Returns how many rows were new.
 */
export async function insertTargets(userId: string, raw: unknown[]) {
  const unique = new Map<string, CategoryTarget>();
  for (const target of raw.map(cleanTarget)) {
    if (target) unique.set(target.categoryKey, target);
  }
  const rows = Array.from(unique.values());
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK).map((t) => ({ ...t, userId }));
    const result = await getDb()
      .insert(categoryTargets)
      .values(chunk)
      .onConflictDoNothing({ target: [categoryTargets.userId, categoryTargets.categoryKey] })
      .returning({ categoryKey: categoryTargets.categoryKey });
    inserted += result.length;
  }
  return { inserted, skipped: raw.length - inserted };
}

export async function deleteAllTargets(userId: string) {
  await getDb().delete(categoryTargets).where(eq(categoryTargets.userId, userId));
}
