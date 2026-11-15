import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { getDb, schema } from "@/db";
import { normalizeNote } from "@/lib/accounts";
import {
  isPeriodKey,
  type RecurringFrequency,
  type RecurringRule,
} from "@/lib/recurring";
import type { TransactionType } from "@/lib/transactions";

const { recurringRules } = schema;

/** Rows per insert, so a big import stays well under request limits. */
const CHUNK = 500;
const MAX_AMOUNT = 1e12;
const MAX_TEXT = 120;
/** `handled` only holds out-of-order keys; anything near this is junk. */
const MAX_HANDLED = 500;

/* ------------------------------------------------------------------ */
/* Validation: never trust what the browser sends                      */
/* ------------------------------------------------------------------ */

function isType(value: unknown): value is TransactionType {
  return value === "income" || value === "expense";
}

function isFrequency(value: unknown): value is RecurringFrequency {
  return value === "monthly" || value === "weekly" || value === "yearly";
}

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

function dayOfMonth(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 31
    ? value
    : null;
}

/**
 * A full rule from the client, cleaned, or null when invalid. Period keys
 * and settling are computed on the client (they depend on its time zone),
 * so the server only checks their shape.
 */
export function cleanRule(raw: unknown): RecurringRule | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const id = text(value.id, 100);
  const category = text(value.category);
  const sum = amount(value.amount);
  const day = dayOfMonth(value.dayOfMonth);
  const startDate = millis(value.startDate);
  const createdAt = millis(value.createdAt);
  const updatedAt = millis(value.updatedAt);
  if (
    !id ||
    !isType(value.type) ||
    !category ||
    sum === null ||
    !isFrequency(value.frequency) ||
    day === null ||
    startDate === null ||
    createdAt === null ||
    updatedAt === null ||
    typeof value.paused !== "boolean" ||
    !Array.isArray(value.handled) ||
    value.handled.length > MAX_HANDLED ||
    !value.handled.every(isPeriodKey) ||
    (value.settledThrough !== undefined &&
      value.settledThrough !== null &&
      !isPeriodKey(value.settledThrough))
  ) {
    return null;
  }

  const rule: RecurringRule = {
    id,
    type: value.type,
    category,
    amount: sum,
    frequency: value.frequency,
    dayOfMonth: day,
    startDate,
    paused: value.paused,
    handled: [...new Set(value.handled as string[])].sort(),
    createdAt,
    updatedAt,
  };
  const note = normalizeNote(typeof value.note === "string" ? value.note : undefined);
  if (note) rule.note = note;
  if (isPeriodKey(value.settledThrough)) rule.settledThrough = value.settledThrough;
  return rule;
}

/* ------------------------------------------------------------------ */
/* Queries — every one is scoped to the signed-in user                 */
/* ------------------------------------------------------------------ */

type Row = typeof recurringRules.$inferSelect;

function toClient(row: Row): RecurringRule {
  const rule: RecurringRule = {
    id: row.id,
    type: row.type,
    category: row.category,
    amount: row.amount,
    frequency: row.frequency,
    dayOfMonth: row.dayOfMonth,
    startDate: row.startDate,
    paused: row.paused,
    handled: Array.isArray(row.handled) ? row.handled : [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
  if (row.note) rule.note = row.note;
  if (row.settledThrough) rule.settledThrough = row.settledThrough;
  return rule;
}

function toRow(rule: RecurringRule) {
  return { ...rule, note: rule.note ?? null, settledThrough: rule.settledThrough ?? null };
}

export async function listRecurringRules(userId: string) {
  const rows = await getDb()
    .select()
    .from(recurringRules)
    .where(eq(recurringRules.userId, userId))
    .orderBy(desc(recurringRules.createdAt));
  return rows.map(toClient);
}

/**
 * Inserts rules, skipping ids that already exist. That makes adding
 * idempotent: a retried save or a second import never duplicates a rule.
 * Returns how many rows were new.
 */
export async function insertRecurringRules(userId: string, raw: unknown[]) {
  const rules = raw.map(cleanRule).filter((r): r is RecurringRule => r !== null);
  let inserted = 0;
  for (let i = 0; i < rules.length; i += CHUNK) {
    const chunk = rules.slice(i, i + CHUNK).map((rule) => ({ ...toRow(rule), userId }));
    const result = await getDb()
      .insert(recurringRules)
      .values(chunk)
      .onConflictDoNothing({ target: recurringRules.id })
      .returning({ id: recurringRules.id });
    inserted += result.length;
  }
  return { inserted, skipped: raw.length - inserted };
}

/**
 * Replaces an existing rule's state with the client's (an edit, a pause, a
 * handled occurrence). Only the user's own row with that id is touched; the
 * id and creation time never change.
 */
export async function saveRecurringRule(userId: string, raw: unknown) {
  const rule = cleanRule(raw);
  if (!rule) return;
  await getDb()
    .update(recurringRules)
    .set({
      type: rule.type,
      category: rule.category,
      amount: rule.amount,
      frequency: rule.frequency,
      dayOfMonth: rule.dayOfMonth,
      startDate: rule.startDate,
      note: rule.note ?? null,
      paused: rule.paused,
      settledThrough: rule.settledThrough ?? null,
      handled: rule.handled,
      updatedAt: rule.updatedAt,
    })
    .where(and(eq(recurringRules.userId, userId), eq(recurringRules.id, rule.id)));
}

export async function deleteRecurringRule(userId: string, id: string) {
  if (typeof id !== "string") return;
  await getDb()
    .delete(recurringRules)
    .where(and(eq(recurringRules.userId, userId), eq(recurringRules.id, id)));
}

export async function deleteAllRecurringRules(userId: string) {
  await getDb().delete(recurringRules).where(eq(recurringRules.userId, userId));
}
