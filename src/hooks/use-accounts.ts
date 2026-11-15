"use client";

import * as React from "react";

import { useLocalStorageJson } from "@/hooks/use-local-storage";
import {
  ACCOUNTS_STORAGE_KEY,
  DEFAULT_ACCOUNT,
  DEFAULT_ACCOUNT_ID,
  LAST_ACCOUNT_STORAGE_KEY,
  TRANSFERS_STORAGE_KEY,
  normalizeNote,
  parseAccounts,
  parseTransfers,
  type Account,
  type AccountKind,
  type AccountProviderId,
  type Transfer,
} from "@/lib/accounts";
import { createId } from "@/lib/id";

// Stable fallbacks: useLocalStorageJson compares snapshots by reference.
const SEEDED_ACCOUNTS: Account[] = [DEFAULT_ACCOUNT];
const EMPTY_TRANSFERS: Transfer[] = [];

function parseLastAccount(raw: string): string | null {
  try {
    const value = JSON.parse(raw);
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}

export interface AccountInput {
  name: string;
  kind: AccountKind;
  /** Undefined for a custom account (it then shows the kind's icon). */
  provider?: AccountProviderId;
  openingBalance?: number;
}

export interface TransferInput {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  createdAt?: number;
  note?: string;
}

/**
 * Raw account and transfer storage. Balances and the "delete reassigns to
 * Cash" rule need the transactions too, so they live in AccountsProvider.
 */
export function useAccounts() {
  const [accounts, setAccounts] = useLocalStorageJson<Account[]>(
    ACCOUNTS_STORAGE_KEY,
    parseAccounts,
    SEEDED_ACCOUNTS,
  );
  const [transfers, setTransfers] = useLocalStorageJson<Transfer[]>(
    TRANSFERS_STORAGE_KEY,
    parseTransfers,
    EMPTY_TRANSFERS,
  );
  const [lastAccountId, setLastAccountId] = useLocalStorageJson<string | null>(
    LAST_ACCOUNT_STORAGE_KEY,
    parseLastAccount,
    null,
  );

  const addAccount = React.useCallback(
    (input: AccountInput) => {
      const account: Account = {
        id: createId(),
        name: input.name.trim(),
        kind: input.kind,
        provider: input.provider,
        openingBalance: input.openingBalance ?? 0,
        createdAt: Date.now(),
      };
      setAccounts((prev) => [...prev, account]);
      return account;
    },
    [setAccounts],
  );

  const updateAccount = React.useCallback(
    (id: string, patch: Partial<AccountInput>) => {
      setAccounts((prev) =>
        prev.map((account) =>
          account.id === id
            ? {
                ...account,
                ...patch,
                name: patch.name?.trim() || account.name,
              }
            : account,
        ),
      );
    },
    [setAccounts],
  );

  /** Drops the account and every transfer touching it. Cash can't be removed. */
  const removeAccountRecord = React.useCallback(
    (id: string) => {
      if (id === DEFAULT_ACCOUNT_ID) return;
      setAccounts((prev) => prev.filter((account) => account.id !== id));
      setTransfers((prev) =>
        prev.filter((t) => t.fromAccountId !== id && t.toAccountId !== id),
      );
      setLastAccountId((prev) => (prev === id ? null : prev));
    },
    [setAccounts, setTransfers, setLastAccountId],
  );

  const addTransfer = React.useCallback(
    (input: TransferInput) => {
      const transfer: Transfer = {
        id: createId(),
        fromAccountId: input.fromAccountId,
        toAccountId: input.toAccountId,
        amount: input.amount,
        createdAt: input.createdAt ?? Date.now(),
      };
      const note = normalizeNote(input.note);
      if (note) transfer.note = note;
      setTransfers((prev) => [transfer, ...prev]);
      return transfer;
    },
    [setTransfers],
  );

  const removeTransfer = React.useCallback(
    (id: string) => {
      setTransfers((prev) => prev.filter((t) => t.id !== id));
    },
    [setTransfers],
  );

  return {
    accounts,
    transfers,
    lastAccountId,
    setLastAccountId,
    addAccount,
    updateAccount,
    removeAccountRecord,
    addTransfer,
    removeTransfer,
  };
}
