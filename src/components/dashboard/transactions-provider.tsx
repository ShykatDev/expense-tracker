"use client";

import * as React from "react";

import { useRemoteTransactions } from "@/hooks/use-remote-transactions";
import { useLocalTransactions } from "@/hooks/use-transactions";
import type {
  NewTransaction,
  Transaction,
  TransactionPatch,
  TransactionType,
} from "@/lib/transactions";

interface TransactionsContextValue {
  transactions: Transaction[];
  /** New fields (note, accountId) are optional, so older callers keep working. */
  addTransactions: (entries: NewTransaction[]) => Transaction[];
  removeTransaction: (id: string) => void;
  updateTransaction: (
    id: string,
    patch: TransactionPatch,
  ) => void;
  renameTransactionCategory: (
    type: TransactionType,
    fromLabel: string,
    toLabel: string,
  ) => void;
  /** Moves an account's entries to another account (undefined = Cash). */
  reassignTransactionAccount: (fromAccountId: string, toAccountId?: string) => void;
  isLoaded: boolean;
}

const TransactionsContext = React.createContext<TransactionsContextValue | null>(
  null,
);

type TransactionsState = ReturnType<typeof useLocalTransactions>;

/** Memoized context value, so consumers only re-render when data changes. */
function useContextValue(state: TransactionsState): TransactionsContextValue {
  const {
    transactions,
    addTransactions,
    removeTransaction,
    updateTransaction,
    renameCategory,
    reassignAccount,
    isLoaded,
  } = state;
  return React.useMemo(
    () => ({
      transactions,
      addTransactions,
      removeTransaction,
      updateTransaction,
      renameTransactionCategory: renameCategory,
      reassignTransactionAccount: reassignAccount,
      isLoaded,
    }),
    [
      transactions,
      addTransactions,
      removeTransaction,
      updateTransaction,
      renameCategory,
      reassignAccount,
      isLoaded,
    ],
  );
}

function LocalTransactionsProvider({ children }: { children: React.ReactNode }) {
  const value = useContextValue(useLocalTransactions());
  return <TransactionsContext.Provider value={value}>{children}</TransactionsContext.Provider>;
}

function RemoteTransactionsProvider({ children }: { children: React.ReactNode }) {
  const value = useContextValue(useRemoteTransactions());
  return <TransactionsContext.Provider value={value}>{children}</TransactionsContext.Provider>;
}

/**
 * The one transactions store for every route, hosted in the root layout.
 *
 * `remote` is decided on the server: once Google sign-in and the database
 * are configured, transactions live in Neon (and sync across devices);
 * otherwise they stay in this browser's localStorage. Both expose the same
 * API, so no screen knows which one it's talking to.
 */
export function TransactionsProvider({
  remote = false,
  children,
}: {
  remote?: boolean;
  children: React.ReactNode;
}) {
  return remote ? (
    <RemoteTransactionsProvider>{children}</RemoteTransactionsProvider>
  ) : (
    <LocalTransactionsProvider>{children}</LocalTransactionsProvider>
  );
}

export function useTransactions() {
  const context = React.useContext(TransactionsContext);
  if (!context) {
    throw new Error(
      "useTransactions must be used within a TransactionsProvider",
    );
  }
  return context;
}
