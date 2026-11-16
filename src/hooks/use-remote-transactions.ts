"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "@yusufceng1z/ding-react";

import { importTransactionsAction } from "@/app/actions/transactions";
import {
  addTransactionsAction,
  reassignTransactionAccountAction,
  removeTransactionAction,
  renameTransactionCategoryAction,
  updateTransactionAction,
} from "@/lib/offline/queued-actions";
import { afterSync, isOfflineError } from "@/lib/offline/sync";
import {
  applyPatch,
  applyReassign,
  applyRename,
  createTransactions,
  normalizePatch,
  restoreInto,
} from "@/lib/transaction-ops";
import {
  STORAGE_KEY,
  type NewTransaction,
  type Transaction,
  type TransactionPatch,
  type TransactionType,
} from "@/lib/transactions";

export const TRANSACTIONS_QUERY_KEY = ["transactions"] as const;

/** Set once this browser's local entries have been uploaded to the account. */
const IMPORTED_FLAG_KEY = "expense-tracker:imported:transactions";

class SignedOutError extends Error {}

async function fetchTransactions(): Promise<Transaction[]> {
  const response = await fetch("/api/data/transactions", { cache: "no-store" });
  if (response.status === 401) throw new SignedOutError("Signed out");
  if (!response.ok) throw new Error(`Couldn't load transactions (${response.status})`);
  return response.json();
}

function readLocalTransactions(): Transaction[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Transactions stored in Neon, with the same API as the browser-storage
 * hook so no screen has to change.
 *
 * Every change is optimistic: the list updates at once and the save runs in
 * the background. If the save fails, the list goes back to what it was and a
 * toast says so — the app keeps feeling instant on a phone either way.
 */
export function useRemoteTransactions() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: TRANSACTIONS_QUERY_KEY,
    queryFn: () => afterSync(fetchTransactions),
    retry: (count, error) =>
      !(error instanceof SignedOutError) && !isOfflineError(error) && count < 1,
  });

  const transactions = query.data ?? EMPTY;

  /**
   * Applies `update` to the cached list now, then runs `save`. On failure the
   * list is restored and refetched so it matches the server again.
   */
  const optimistic = React.useCallback(
    (update: (list: Transaction[]) => Transaction[], save: () => Promise<unknown>) => {
      void queryClient.cancelQueries({ queryKey: TRANSACTIONS_QUERY_KEY });
      const previous = queryClient.getQueryData<Transaction[]>(TRANSACTIONS_QUERY_KEY);
      queryClient.setQueryData<Transaction[]>(TRANSACTIONS_QUERY_KEY, (list) => update(list ?? []));
      save().catch(() => {
        queryClient.setQueryData(TRANSACTIONS_QUERY_KEY, previous);
        void queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY });
        toast.error("That change couldn’t be saved, so it was undone.");
      });
    },
    [queryClient],
  );

  const addTransactions = React.useCallback(
    (entries: NewTransaction[]) => {
      const created = createTransactions(entries);
      optimistic((list) => [...created, ...list], () => addTransactionsAction(created));
      // Returned straight away, so callers can keep the new ids.
      return created;
    },
    [optimistic],
  );

  const removeTransaction = React.useCallback(
    (id: string) => {
      optimistic((list) => list.filter((t) => t.id !== id), () => removeTransactionAction(id));
    },
    [optimistic],
  );

  /** Puts deleted entries back exactly as they were (Undo). */
  const restoreTransactions = React.useCallback(
    (rows: Transaction[]) => {
      optimistic((list) => restoreInto(list, rows), () => addTransactionsAction(rows));
    },
    [optimistic],
  );

  const updateTransaction = React.useCallback(
    (id: string, patch: TransactionPatch) => {
      const normalized = normalizePatch(patch);
      optimistic(
        (list) => list.map((t) => (t.id === id ? applyPatch(t, normalized) : t)),
        () => updateTransactionAction(id, normalized),
      );
    },
    [optimistic],
  );

  const renameCategory = React.useCallback(
    (type: TransactionType, fromLabel: string, toLabel: string) => {
      if (fromLabel === toLabel) return;
      optimistic(
        (list) => applyRename(list, type, fromLabel, toLabel),
        () => renameTransactionCategoryAction(type, fromLabel, toLabel),
      );
    },
    [optimistic],
  );

  const reassignAccount = React.useCallback(
    (fromAccountId: string, toAccountId?: string) => {
      optimistic(
        (list) => applyReassign(list, fromAccountId, toAccountId),
        () => reassignTransactionAccountAction(fromAccountId, toAccountId),
      );
    },
    [optimistic],
  );

  // One-time import: entries saved in this browser before sign-in are
  // uploaded to the account once. Ids are kept, so running it again (another
  // tab, a retry) can't duplicate anything. The local copy stays as a backup
  // until the browser-storage code is removed.
  const importStarted = React.useRef(false);
  React.useEffect(() => {
    if (!query.isSuccess || importStarted.current) return;
    importStarted.current = true;
    try {
      if (window.localStorage.getItem(IMPORTED_FLAG_KEY)) return;
    } catch {
      return;
    }
    const local = readLocalTransactions();
    const markDone = () => {
      try {
        window.localStorage.setItem(IMPORTED_FLAG_KEY, String(Date.now()));
      } catch {
        // Storage blocked: the import may run again, which is harmless.
      }
    };
    if (local.length === 0) {
      markDone();
      return;
    }
    importTransactionsAction(local)
      .then(({ inserted }) => {
        markDone();
        void queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY });
        if (inserted > 0) {
          toast.success(
            `Moved ${inserted} ${inserted === 1 ? "entry" : "entries"} from this device to your account`,
          );
        }
      })
      .catch(() => {
        // Not marked done, so it's tried again next time the app opens.
        importStarted.current = false;
        toast.error("Couldn’t upload this device’s entries yet. It will retry next time.");
      });
  }, [query.isSuccess, queryClient]);

  // A failed first load (not just being signed out) is worth a toast.
  React.useEffect(() => {
    if (query.isError &&
      !(query.error instanceof SignedOutError) &&
      !isOfflineError(query.error)) {
      toast.error("Couldn’t load your transactions. Reopen the app to try again.");
    }
  }, [query.isError, query.error]);

  return {
    transactions,
    addTransactions,
    removeTransaction,
    restoreTransactions,
    updateTransaction,
    renameCategory,
    reassignAccount,
    isLoaded: !query.isPending,
  };
}

const EMPTY: Transaction[] = [];
