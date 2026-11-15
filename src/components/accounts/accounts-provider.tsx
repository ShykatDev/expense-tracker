"use client";

import * as React from "react";

import { useTransactions } from "@/components/dashboard/transactions-provider";
import {
  useAccounts as useAccountsState,
  type AccountInput,
  type TransferInput,
} from "@/hooks/use-accounts";
import {
  computeAccountBalances,
  DEFAULT_ACCOUNT_ID,
  type Account,
  type Transfer,
} from "@/lib/accounts";

interface AccountsContextValue {
  /** Always contains Cash, first. */
  accounts: Account[];
  /** Newest first. */
  transfers: Transfer[];
  /** Current balance per account id. */
  balances: Record<string, number>;
  /** True once the user has added a second account; gates all account UI. */
  hasMultipleAccounts: boolean;
  /** Resolves an id (or a missing one) to an account, falling back to Cash. */
  getAccount: (id: string | undefined) => Account;
  /** The account the next new entry should default to. */
  defaultEntryAccountId: string;
  setLastAccountId: (id: string) => void;
  addAccount: (input: AccountInput) => Account;
  updateAccount: (id: string, patch: Partial<AccountInput>) => void;
  /**
   * Deletes an account. Its income and expense entries move to Cash (so the
   * overall totals don't change) and its transfers are removed.
   */
  removeAccount: (id: string) => void;
  addTransfer: (input: TransferInput) => Transfer;
  removeTransfer: (id: string) => void;
}

const AccountsContext = React.createContext<AccountsContextValue | null>(null);

/**
 * Accounts, transfers and per-account balances for every route. It sits
 * inside TransactionsProvider because balances are derived from the ledger.
 */
export function AccountsProvider({ children }: { children: React.ReactNode }) {
  const { transactions, reassignTransactionAccount } = useTransactions();
  const {
    accounts,
    transfers,
    lastAccountId,
    setLastAccountId,
    addAccount,
    updateAccount,
    removeAccountRecord,
    addTransfer,
    removeTransfer,
  } = useAccountsState();

  const balances = React.useMemo(
    () => computeAccountBalances(accounts, transactions, transfers),
    [accounts, transactions, transfers],
  );

  const getAccount = React.useCallback(
    (id: string | undefined) =>
      accounts.find((a) => a.id === (id ?? DEFAULT_ACCOUNT_ID)) ?? accounts[0],
    [accounts],
  );

  const defaultEntryAccountId =
    lastAccountId && accounts.some((a) => a.id === lastAccountId)
      ? lastAccountId
      : DEFAULT_ACCOUNT_ID;

  const removeAccount = React.useCallback(
    (id: string) => {
      if (id === DEFAULT_ACCOUNT_ID) return;
      reassignTransactionAccount(id, DEFAULT_ACCOUNT_ID);
      removeAccountRecord(id);
    },
    [reassignTransactionAccount, removeAccountRecord],
  );

  const setLast = React.useCallback(
    (id: string) => setLastAccountId(id),
    [setLastAccountId],
  );

  const value = React.useMemo(
    () => ({
      accounts,
      transfers,
      balances,
      hasMultipleAccounts: accounts.length > 1,
      getAccount,
      defaultEntryAccountId,
      setLastAccountId: setLast,
      addAccount,
      updateAccount,
      removeAccount,
      addTransfer,
      removeTransfer,
    }),
    [
      accounts,
      transfers,
      balances,
      getAccount,
      defaultEntryAccountId,
      setLast,
      addAccount,
      updateAccount,
      removeAccount,
      addTransfer,
      removeTransfer,
    ],
  );

  return (
    <AccountsContext.Provider value={value}>{children}</AccountsContext.Provider>
  );
}

export function useAccounts() {
  const context = React.useContext(AccountsContext);
  if (!context) {
    throw new Error("useAccounts must be used within an AccountsProvider");
  }
  return context;
}
