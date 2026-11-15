"use server";

import * as data from "@/server/accounts";
import { requireUserId } from "@/server/session";

/*
 * Account and transfer writes, each scoped to the signed-in user. Reads go
 * through GET /api/data/accounts.
 */

export async function addAccountAction(account: unknown) {
  const userId = await requireUserId();
  await data.insertAccounts(userId, [account]);
}

export async function updateAccountAction(accountId: string, patch: Record<string, unknown>) {
  const userId = await requireUserId();
  await data.updateAccount(userId, accountId, patch);
}

/** Its transactions are moved to Cash separately, by the transactions action. */
export async function removeAccountAction(accountId: string) {
  const userId = await requireUserId();
  await data.deleteAccount(userId, accountId);
}

export async function addTransferAction(transfer: unknown) {
  const userId = await requireUserId();
  await data.insertTransfers(userId, [transfer]);
}

export async function removeTransferAction(transferId: string) {
  const userId = await requireUserId();
  await data.deleteTransfers(userId, [transferId]);
}

/**
 * One-time upload of this browser's accounts and transfers. Accounts go
 * first so transfers never point at an account the server doesn't know.
 * Safe to repeat: existing ids are skipped.
 */
export async function importAccountsAction(accounts: unknown[], transfers: unknown[]) {
  const userId = await requireUserId();
  const insertedAccounts = await data.insertAccounts(userId, accounts);
  const insertedTransfers = await data.insertTransfers(userId, transfers);
  return { accounts: insertedAccounts, transfers: insertedTransfers };
}

/** "Reset all data": removes every account and transfer. */
export async function deleteAllAccountsAction() {
  const userId = await requireUserId();
  await data.deleteAllAccounts(userId);
}
