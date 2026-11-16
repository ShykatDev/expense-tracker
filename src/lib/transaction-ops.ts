/**
 * Pure transaction operations, shared by the browser-storage hook and the
 * server-backed one so both produce exactly the same rows. The server
 * re-validates everything it receives (see src/server/transactions.ts).
 */
import { DEFAULT_ACCOUNT_ID, normalizeNote } from "@/lib/accounts";
import { createId } from "@/lib/id";
import type {
  NewTransaction,
  Transaction,
  TransactionPatch,
  TransactionType,
} from "@/lib/transactions";

/**
 * Cash is the implicit account, so it is stored as "no accountId". That keeps
 * old and new Cash entries identical.
 */
export function normalizeAccountId(accountId: string | undefined | null) {
  return accountId && accountId !== DEFAULT_ACCOUNT_ID ? accountId : undefined;
}

/**
 * Turns new entries into full transactions with client-made ids. Making the
 * id on the client lets callers use it straight away (a goal completion
 * keeps its transaction id) while the save is still on its way.
 */
export function createTransactions(entries: NewTransaction[], now = Date.now()) {
  return entries.map((entry) => {
    const transaction: Transaction = {
      id: createId(),
      createdAt: entry.createdAt ?? now,
      type: entry.type,
      category: entry.category,
      amount: entry.amount,
    };
    // Optional fields only when present, so plain entries keep the shape
    // they had before notes and accounts existed.
    const note = normalizeNote(entry.note);
    if (note) transaction.note = note;
    const accountId = normalizeAccountId(entry.accountId);
    if (accountId) transaction.accountId = accountId;
    return transaction;
  });
}

/** Normalizes a patch the same way new entries are normalized. */
export function normalizePatch(patch: TransactionPatch): TransactionPatch {
  const normalized: TransactionPatch = { ...patch };
  if ("note" in patch) normalized.note = normalizeNote(patch.note);
  if ("accountId" in patch) normalized.accountId = normalizeAccountId(patch.accountId);
  return normalized;
}

/** Applies a normalized patch, dropping optional fields that became empty. */
export function applyPatch(transaction: Transaction, patch: TransactionPatch): Transaction {
  const next: Transaction = { ...transaction, ...patch };
  if (next.note === undefined) delete next.note;
  if (next.accountId === undefined) delete next.accountId;
  return next;
}

/** Rewrites a category label on past entries after a rename. */
export function applyRename(
  transactions: Transaction[],
  type: TransactionType,
  fromLabel: string,
  toLabel: string,
) {
  return transactions.map((t) =>
    t.type === type && t.category === fromLabel ? { ...t, category: toLabel } : t,
  );
}

/** Moves every entry of one account to another (undefined = Cash). */
export function applyReassign(
  transactions: Transaction[],
  fromAccountId: string,
  toAccountId?: string,
) {
  const target = normalizeAccountId(toAccountId);
  return transactions.map((t) => {
    if (t.accountId !== fromAccountId) return t;
    const next: Transaction = { ...t };
    if (target) next.accountId = target;
    else delete next.accountId;
    return next;
  });
}

/**
 * Puts deleted entries back (Undo) with their ids, skipping any that are
 * somehow still there. They go to the front, like a new entry: the list is
 * kept in entry order, and screens sort by date where they need to.
 */
export function restoreInto(transactions: Transaction[], rows: Transaction[]) {
  const ids = new Set(transactions.map((t) => t.id));
  return [...rows.filter((row) => !ids.has(row.id)), ...transactions];
}
