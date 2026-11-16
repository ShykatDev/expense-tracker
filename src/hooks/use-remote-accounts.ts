"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "@yusufceng1z/ding-react";

import { importAccountsAction } from "@/app/actions/accounts";
import {
  addAccountAction,
  addTransferAction,
  removeAccountAction,
  removeTransferAction,
  updateAccountAction,
} from "@/lib/offline/queued-actions";
import { afterSync, isOfflineError } from "@/lib/offline/sync";
import { parseLastAccount, type AccountInput, type TransferInput } from "@/hooks/use-accounts";
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
  type Transfer,
} from "@/lib/accounts";
import { createId } from "@/lib/id";

export const ACCOUNTS_QUERY_KEY = ["accounts"] as const;

/** Set once this browser's accounts and transfers are on the account. */
const IMPORTED_FLAG_KEY = "expense-tracker:imported:accounts";

interface AccountsData {
  accounts: Account[];
  transfers: Transfer[];
}

/** Until the first load, Cash alone, so nothing that needs an account breaks. */
const INITIAL: AccountsData = { accounts: [DEFAULT_ACCOUNT], transfers: [] };

class SignedOutError extends Error {}

async function fetchAccounts(): Promise<AccountsData> {
  const response = await fetch("/api/data/accounts", { cache: "no-store" });
  if (response.status === 401) throw new SignedOutError("Signed out");
  if (!response.ok) throw new Error(`Couldn't load accounts (${response.status})`);
  return response.json();
}

function readLocal() {
  try {
    const accounts = parseAccounts(window.localStorage.getItem(ACCOUNTS_STORAGE_KEY) ?? "[]");
    const transfers = parseTransfers(window.localStorage.getItem(TRANSFERS_STORAGE_KEY) ?? "[]");
    return { accounts, transfers };
  } catch {
    return { accounts: [], transfers: [] };
  }
}

/**
 * Accounts and transfers stored in Neon, with the same API as the
 * browser-storage hook. Changes are optimistic and roll back with a toast if
 * the save fails. "Last account used" stays on this device on purpose: it's
 * a per-device convenience, not data.
 */
export function useRemoteAccounts() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ACCOUNTS_QUERY_KEY,
    queryFn: () => afterSync(fetchAccounts),
    retry: (count, error) =>
      !(error instanceof SignedOutError) && !isOfflineError(error) && count < 1,
  });
  const data = query.data ?? INITIAL;

  const [lastAccountId, setLastAccountId] = useLocalStorageJson<string | null>(
    LAST_ACCOUNT_STORAGE_KEY,
    parseLastAccount,
    null,
  );

  const optimistic = React.useCallback(
    (update: (current: AccountsData) => AccountsData, save: () => Promise<unknown>) => {
      void queryClient.cancelQueries({ queryKey: ACCOUNTS_QUERY_KEY });
      const previous = queryClient.getQueryData<AccountsData>(ACCOUNTS_QUERY_KEY);
      queryClient.setQueryData<AccountsData>(ACCOUNTS_QUERY_KEY, (current) =>
        update(current ?? INITIAL),
      );
      save().catch(() => {
        queryClient.setQueryData(ACCOUNTS_QUERY_KEY, previous);
        void queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY });
        toast.error("That change couldn’t be saved, so it was undone.");
      });
    },
    [queryClient],
  );

  const addAccount = React.useCallback(
    (input: AccountInput) => {
      const account: Account = {
        id: createId(),
        name: input.name.trim(),
        kind: input.kind,
        openingBalance: input.openingBalance ?? 0,
        createdAt: Date.now(),
      };
      if (input.provider) account.provider = input.provider;
      optimistic(
        (current) => ({ ...current, accounts: [...current.accounts, account] }),
        () => addAccountAction(account),
      );
      return account;
    },
    [optimistic],
  );

  const updateAccount = React.useCallback(
    (id: string, patch: Partial<AccountInput>) => {
      optimistic(
        (current) => ({
          ...current,
          accounts: current.accounts.map((account) =>
            account.id === id
              ? { ...account, ...patch, name: patch.name?.trim() || account.name }
              : account,
          ),
        }),
        // "provider" must reach the server even when it's undefined (switching
        // to a custom account clears the logo), so send it as null.
        () =>
          updateAccountAction(id, {
            ...patch,
            ...("provider" in patch ? { provider: patch.provider ?? null } : {}),
          }),
      );
    },
    [optimistic],
  );

  /** Drops the account and every transfer touching it. Cash can't be removed. */
  const removeAccountRecord = React.useCallback(
    (id: string) => {
      if (id === DEFAULT_ACCOUNT_ID) return;
      optimistic(
        (current) => ({
          accounts: current.accounts.filter((account) => account.id !== id),
          transfers: current.transfers.filter(
            (t) => t.fromAccountId !== id && t.toAccountId !== id,
          ),
        }),
        () => removeAccountAction(id),
      );
      setLastAccountId((prev) => (prev === id ? null : prev));
    },
    [optimistic, setLastAccountId],
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
      optimistic(
        (current) => ({ ...current, transfers: [transfer, ...current.transfers] }),
        () => addTransferAction(transfer),
      );
      return transfer;
    },
    [optimistic],
  );

  const removeTransfer = React.useCallback(
    (id: string) => {
      optimistic(
        (current) => ({ ...current, transfers: current.transfers.filter((t) => t.id !== id) }),
        () => removeTransferAction(id),
      );
    },
    [optimistic],
  );

  // One-time import of this browser's accounts and transfers (see the
  // transactions hook). Ids are kept, so a repeat can't duplicate anything.
  const importStarted = React.useRef(false);
  React.useEffect(() => {
    if (!query.isSuccess || importStarted.current) return;
    importStarted.current = true;
    try {
      if (window.localStorage.getItem(IMPORTED_FLAG_KEY)) return;
    } catch {
      return;
    }
    const markDone = () => {
      try {
        window.localStorage.setItem(IMPORTED_FLAG_KEY, String(Date.now()));
      } catch {
        // Storage blocked: the import may run again, which is harmless.
      }
    };
    const local = readLocal();
    // Cash with no opening balance is just the default; nothing to upload.
    const accounts = local.accounts.filter(
      (a) => a.id !== DEFAULT_ACCOUNT_ID || a.openingBalance !== 0 || a.name !== DEFAULT_ACCOUNT.name,
    );
    if (accounts.length === 0 && local.transfers.length === 0) {
      markDone();
      return;
    }
    importAccountsAction(accounts, local.transfers)
      .then((result) => {
        markDone();
        void queryClient.invalidateQueries({ queryKey: ACCOUNTS_QUERY_KEY });
        const moved = result.accounts + result.transfers;
        if (moved > 0) toast.success("Moved this device’s accounts to your account");
      })
      .catch(() => {
        importStarted.current = false;
        toast.error("Couldn’t upload this device’s accounts yet. It will retry next time.");
      });
  }, [query.isSuccess, queryClient]);

  React.useEffect(() => {
    if (query.isError &&
      !(query.error instanceof SignedOutError) &&
      !isOfflineError(query.error)) {
      toast.error("Couldn’t load your accounts. Reopen the app to try again.");
    }
  }, [query.isError, query.error]);

  return {
    accounts: data.accounts,
    transfers: data.transfers,
    lastAccountId,
    setLastAccountId,
    addAccount,
    updateAccount,
    removeAccountRecord,
    addTransfer,
    removeTransfer,
  };
}
