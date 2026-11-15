"use server";

import * as data from "@/server/transactions";
import { requireUserId } from "@/server/session";
import type { TransactionPatch, TransactionType } from "@/lib/transactions";

/*
 * Transaction writes. Each action checks the session first and only touches
 * the signed-in user's rows. Reads go through GET /api/data/transactions
 * instead: server actions run one at a time, which suits writes but would
 * hold reads up behind them.
 */

/** Saves transactions the client already created (ids included). */
export async function addTransactionsAction(rows: unknown[]) {
  const userId = await requireUserId();
  await data.insertTransactions(userId, rows);
}

export async function updateTransactionAction(id: string, patch: TransactionPatch) {
  const userId = await requireUserId();
  await data.updateTransaction(userId, id, patch);
}

export async function removeTransactionAction(id: string) {
  const userId = await requireUserId();
  await data.deleteTransactions(userId, [id]);
}

export async function renameTransactionCategoryAction(
  type: TransactionType,
  fromLabel: string,
  toLabel: string,
) {
  const userId = await requireUserId();
  await data.renameCategory(userId, type, fromLabel, toLabel);
}

export async function reassignTransactionAccountAction(fromAccountId: string, toAccountId?: string) {
  const userId = await requireUserId();
  await data.reassignAccount(userId, fromAccountId, toAccountId);
}

/**
 * One-time upload of the transactions saved in this browser before sign-in.
 * Safe to repeat: entries already on the server are skipped by id.
 */
export async function importTransactionsAction(rows: unknown[]) {
  const userId = await requireUserId();
  return data.insertTransactions(userId, rows);
}

/** "Reset all data": removes every transaction on the account. */
export async function deleteAllTransactionsAction() {
  const userId = await requireUserId();
  await data.deleteAllTransactions(userId);
}
