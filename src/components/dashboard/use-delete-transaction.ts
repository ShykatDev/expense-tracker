"use client";

import * as React from "react";

import { useTransactions } from "@/components/dashboard/transactions-provider";
import { formatCurrency, type Transaction } from "@/lib/transactions";
import { undoToast } from "@/lib/undo-toast";

/** Deletes an entry at once, with Undo in the toast (no confirm dialog). */
export function useDeleteTransaction() {
  const { removeTransaction, restoreTransactions } = useTransactions();
  return React.useCallback(
    (transaction: Transaction) => {
      removeTransaction(transaction.id);
      undoToast(`Deleted ${transaction.category} · ${formatCurrency(transaction.amount)}`, () =>
        restoreTransactions([transaction]),
      );
    },
    [removeTransaction, restoreTransactions],
  );
}
