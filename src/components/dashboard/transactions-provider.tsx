"use client";

import * as React from "react";

import { useTransactions as useTransactionsState } from "@/hooks/use-transactions";
import type { Transaction, TransactionType } from "@/lib/transactions";

interface TransactionsContextValue {
  transactions: Transaction[];
  addTransactions: (entries: {
    type: TransactionType;
    category: string;
    amount: number;
    createdAt?: number;
  }[]) => Transaction[];
  removeTransaction: (id: string) => void;
  updateTransaction: (
    id: string,
    patch: Partial<Pick<Transaction, "category" | "amount" | "type" | "createdAt">>,
  ) => void;
  renameTransactionCategory: (
    type: TransactionType,
    fromLabel: string,
    toLabel: string,
  ) => void;
  isLoaded: boolean;
}

const TransactionsContext = React.createContext<TransactionsContextValue | null>(
  null,
);

/**
 * `useTransactions` keeps its state in the hook instance, so two independent
 * instances drift apart: the shared bottom bar would write to localStorage
 * without the dashboard's list ever seeing the change. Hosting the hook once
 * in the root layout gives every route the same instance.
 */
export function TransactionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { transactions, addTransactions, removeTransaction, updateTransaction, renameCategory, isLoaded } =
    useTransactionsState();

  const value = React.useMemo(
    () => ({
      transactions,
      addTransactions,
      removeTransaction,
      updateTransaction,
      renameTransactionCategory: renameCategory,
      isLoaded,
    }),
    [
      transactions,
      addTransactions,
      removeTransaction,
      updateTransaction,
      renameCategory,
      isLoaded,
    ],
  );

  return (
    <TransactionsContext.Provider value={value}>
      {children}
    </TransactionsContext.Provider>
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
