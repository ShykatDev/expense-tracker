import "server-only";

import { and, asc, desc, eq, inArray, or } from "drizzle-orm";

import { getDb, schema } from "@/db";
import {
  ACCOUNT_KINDS,
  ACCOUNT_PROVIDERS,
  DEFAULT_ACCOUNT,
  DEFAULT_ACCOUNT_ID,
  MAX_ACCOUNT_NAME_LENGTH,
  normalizeNote,
  type Account,
  type AccountKind,
  type AccountProviderId,
  type Transfer,
} from "@/lib/accounts";

const { accounts, transfers } = schema;

const KINDS = new Set<string>(ACCOUNT_KINDS.map((k) => k.value));
const PROVIDERS = new Set<string>(ACCOUNT_PROVIDERS.map((p) => p.id));
const MAX_AMOUNT = 1e12;

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

function id(value: unknown) {
  return typeof value === "string" && value && value.length <= 100 ? value : null;
}

function name(value: unknown) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed ? trimmed.slice(0, MAX_ACCOUNT_NAME_LENGTH) : null;
}

function kind(value: unknown): AccountKind | null {
  return typeof value === "string" && KINDS.has(value) ? (value as AccountKind) : null;
}

function provider(value: unknown): AccountProviderId | null {
  return typeof value === "string" && PROVIDERS.has(value) ? (value as AccountProviderId) : null;
}

/** Opening balances may be zero (or negative, for an overdrawn card). */
function balance(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) < MAX_AMOUNT
    ? Math.round(value * 100) / 100
    : null;
}

function positive(value: unknown) {
  const sum = balance(value);
  return sum !== null && sum > 0 ? sum : null;
}

function millis(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
}

export function cleanAccount(raw: unknown): Account | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const accountId = id(value.id);
  const accountName = name(value.name);
  if (!accountId || !accountName) return null;
  const account: Account = {
    id: accountId,
    name: accountName,
    kind: kind(value.kind) ?? "other",
    openingBalance: balance(value.openingBalance) ?? 0,
    createdAt: millis(value.createdAt) ?? Date.now(),
  };
  const known = provider(value.provider);
  if (known) account.provider = known;
  return account;
}

export function cleanTransfer(raw: unknown): Transfer | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const transferId = id(value.id);
  const from = id(value.fromAccountId);
  const to = id(value.toAccountId);
  const sum = positive(value.amount);
  if (!transferId || !from || !to || from === to || sum === null) return null;
  const transfer: Transfer = {
    id: transferId,
    fromAccountId: from,
    toAccountId: to,
    amount: sum,
    createdAt: millis(value.createdAt) ?? Date.now(),
  };
  const note = normalizeNote(typeof value.note === "string" ? value.note : undefined);
  if (note) transfer.note = note;
  return transfer;
}

/* ------------------------------------------------------------------ */
/* Queries — all scoped to the signed-in user                          */
/* ------------------------------------------------------------------ */

function accountToClient(row: typeof accounts.$inferSelect): Account {
  const account: Account = {
    id: row.id,
    name: row.name,
    kind: row.kind,
    openingBalance: row.openingBalance,
    createdAt: row.createdAt,
  };
  if (row.provider && PROVIDERS.has(row.provider)) {
    account.provider = row.provider as AccountProviderId;
  }
  return account;
}

function transferToClient(row: typeof transfers.$inferSelect): Transfer {
  const transfer: Transfer = {
    id: row.id,
    fromAccountId: row.fromAccountId,
    toAccountId: row.toAccountId,
    amount: row.amount,
    createdAt: row.createdAt,
  };
  if (row.note) transfer.note = row.note;
  return transfer;
}

/**
 * The user's accounts (Cash first, always present: it only gets a row once
 * it's edited) and transfers (newest first).
 */
export async function listAccounts(userId: string) {
  const db = getDb();
  const [accountRows, transferRows] = await Promise.all([
    db.select().from(accounts).where(eq(accounts.userId, userId)).orderBy(asc(accounts.createdAt)),
    db.select().from(transfers).where(eq(transfers.userId, userId)).orderBy(desc(transfers.createdAt)),
  ]);
  const list = accountRows.map(accountToClient);
  const cash = list.find((a) => a.id === DEFAULT_ACCOUNT_ID) ?? DEFAULT_ACCOUNT;
  return {
    accounts: [cash, ...list.filter((a) => a.id !== DEFAULT_ACCOUNT_ID)],
    transfers: transferRows.map(transferToClient),
  };
}

function accountRow(userId: string, account: Account) {
  return { ...account, provider: account.provider ?? null, userId };
}

/** Inserts accounts, skipping ids the user already has. */
export async function insertAccounts(userId: string, raw: unknown[]) {
  const rows = raw.map(cleanAccount).filter((a): a is Account => a !== null);
  if (rows.length === 0) return 0;
  const result = await getDb()
    .insert(accounts)
    .values(rows.map((a) => accountRow(userId, a)))
    .onConflictDoNothing({ target: [accounts.userId, accounts.id] })
    .returning({ id: accounts.id });
  return result.length;
}

/**
 * Applies a partial edit. Cash has no row until it's first edited, so an
 * edit to Cash creates it from the defaults.
 */
export async function updateAccount(userId: string, accountId: string, patch: Record<string, unknown>) {
  const set: Partial<typeof accounts.$inferInsert> = {};
  if ("name" in patch) {
    const accountName = name(patch.name);
    if (accountName) set.name = accountName;
  }
  if ("kind" in patch && accountId !== DEFAULT_ACCOUNT_ID) {
    const accountKind = kind(patch.kind);
    if (accountKind) set.kind = accountKind;
  }
  if ("provider" in patch && accountId !== DEFAULT_ACCOUNT_ID) {
    set.provider = provider(patch.provider);
  }
  if ("openingBalance" in patch) {
    const opening = balance(patch.openingBalance);
    if (opening !== null) set.openingBalance = opening;
  }
  if (Object.keys(set).length === 0) return;

  const db = getDb();
  if (accountId === DEFAULT_ACCOUNT_ID) {
    await db
      .insert(accounts)
      .values({ ...accountRow(userId, DEFAULT_ACCOUNT), ...set })
      .onConflictDoUpdate({ target: [accounts.userId, accounts.id], set });
    return;
  }
  await db
    .update(accounts)
    .set(set)
    .where(and(eq(accounts.userId, userId), eq(accounts.id, accountId)));
}

/** Deletes an account and every transfer touching it. Cash can't be deleted. */
export async function deleteAccount(userId: string, accountId: string) {
  if (accountId === DEFAULT_ACCOUNT_ID) return;
  const db = getDb();
  await db
    .delete(transfers)
    .where(
      and(
        eq(transfers.userId, userId),
        or(eq(transfers.fromAccountId, accountId), eq(transfers.toAccountId, accountId)),
      ),
    );
  await db.delete(accounts).where(and(eq(accounts.userId, userId), eq(accounts.id, accountId)));
}

/** Inserts transfers, skipping ids that already exist. */
export async function insertTransfers(userId: string, raw: unknown[]) {
  const rows = raw.map(cleanTransfer).filter((t): t is Transfer => t !== null);
  if (rows.length === 0) return 0;
  const result = await getDb()
    .insert(transfers)
    .values(rows.map((t) => ({ ...t, note: t.note ?? null, userId })))
    .onConflictDoNothing({ target: transfers.id })
    .returning({ id: transfers.id });
  return result.length;
}

export async function deleteTransfers(userId: string, ids: string[]) {
  if (ids.length === 0) return;
  await getDb()
    .delete(transfers)
    .where(and(eq(transfers.userId, userId), inArray(transfers.id, ids)));
}

export async function deleteAllAccounts(userId: string) {
  const db = getDb();
  await db.delete(transfers).where(eq(transfers.userId, userId));
  await db.delete(accounts).where(eq(accounts.userId, userId));
}
