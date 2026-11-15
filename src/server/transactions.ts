import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";

import { getDb, schema } from "@/db";
import { normalizeNote } from "@/lib/accounts";
import { normalizeAccountId } from "@/lib/transaction-ops";
import type { Transaction, TransactionPatch, TransactionType } from "@/lib/transactions";

const { transactions } = schema;

/** Rows per insert, so a big import stays well under request limits. */
const CHUNK = 500;
const MAX_AMOUNT = 1e12;
const MAX_TEXT = 120;

/* ------------------------------------------------------------------ */
/* Validation: never trust what the browser sends                      */
/* ------------------------------------------------------------------ */

function isType(value: unknown): value is TransactionType {
  return value === "income" || value === "expense";
}

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

/** A full transaction from the client, cleaned, or null when invalid. */
export function cleanTransaction(raw: unknown): Transaction | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const id = text(value.id, 100);
  const category = text(value.category);
  const sum = amount(value.amount);
  const createdAt = millis(value.createdAt);
  if (!id || !isType(value.type) || !category || sum === null || createdAt === null) return null;

  const transaction: Transaction = { id, type: value.type, category, amount: sum, createdAt };
  const note = normalizeNote(typeof value.note === "string" ? value.note : undefined);
  if (note) transaction.note = note;
  const accountId = normalizeAccountId(text(value.accountId, 100));
  if (accountId) transaction.accountId = accountId;
  return transaction;
}

/** A patch from the client, cleaned. Unknown or invalid fields are dropped. */
function cleanPatch(raw: TransactionPatch) {
  const set: Partial<typeof transactions.$inferInsert> = {};
  if (raw.type !== undefined && isType(raw.type)) set.type = raw.type;
  if (raw.category !== undefined) {
    const category = text(raw.category);
    if (category) set.category = category;
  }
  if (raw.amount !== undefined) {
    const sum = amount(raw.amount);
    if (sum !== null) set.amount = sum;
  }
  if (raw.createdAt !== undefined) {
    const createdAt = millis(raw.createdAt);
    if (createdAt !== null) set.createdAt = createdAt;
  }
  // `in` rather than `!== undefined`: a cleared note or a move back to Cash
  // arrives as an explicit undefined and must become NULL.
  if ("note" in raw) set.note = normalizeNote(raw.note) ?? null;
  if ("accountId" in raw) set.accountId = normalizeAccountId(text(raw.accountId, 100)) ?? null;
  return set;
}

/* ------------------------------------------------------------------ */
/* Queries — every one is scoped to the signed-in user                 */
/* ------------------------------------------------------------------ */

type Row = typeof transactions.$inferSelect;

function toClient(row: Row): Transaction {
  const transaction: Transaction = {
    id: row.id,
    type: row.type,
    category: row.category,
    amount: row.amount,
    createdAt: row.createdAt,
  };
  if (row.note) transaction.note = row.note;
  if (row.accountId) transaction.accountId = row.accountId;
  return transaction;
}

export async function listTransactions(userId: string) {
  const rows = await getDb()
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.createdAt));
  return rows.map(toClient);
}

/**
 * Inserts transactions, skipping ids that already exist. That makes adding
 * idempotent: a retried save or a second import never duplicates entries.
 * Returns how many rows were new.
 */
export async function insertTransactions(userId: string, raw: unknown[]) {
  const rows = raw.map(cleanTransaction).filter((t): t is Transaction => t !== null);
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK).map((t) => ({
      ...t,
      note: t.note ?? null,
      accountId: t.accountId ?? null,
      userId,
    }));
    const result = await getDb()
      .insert(transactions)
      .values(chunk)
      .onConflictDoNothing({ target: transactions.id })
      .returning({ id: transactions.id });
    inserted += result.length;
  }
  return { inserted, skipped: raw.length - inserted };
}

export async function updateTransaction(userId: string, id: string, patch: TransactionPatch) {
  const set = cleanPatch(patch);
  if (Object.keys(set).length === 0) return;
  await getDb()
    .update(transactions)
    .set(set)
    .where(and(eq(transactions.userId, userId), eq(transactions.id, id)));
}

export async function deleteTransactions(userId: string, ids: string[]) {
  if (ids.length === 0) return;
  await getDb()
    .delete(transactions)
    .where(and(eq(transactions.userId, userId), inArray(transactions.id, ids)));
}

export async function renameCategory(
  userId: string,
  type: TransactionType,
  fromLabel: string,
  toLabel: string,
) {
  const to = text(toLabel);
  if (!isType(type) || !to || fromLabel === to) return;
  await getDb()
    .update(transactions)
    .set({ category: to })
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, type),
        eq(transactions.category, fromLabel),
      ),
    );
}

export async function reassignAccount(userId: string, fromAccountId: string, toAccountId?: string) {
  await getDb()
    .update(transactions)
    .set({ accountId: normalizeAccountId(toAccountId) ?? null })
    .where(and(eq(transactions.userId, userId), eq(transactions.accountId, fromAccountId)));
}

export async function deleteAllTransactions(userId: string) {
  await getDb().delete(transactions).where(eq(transactions.userId, userId));
}
