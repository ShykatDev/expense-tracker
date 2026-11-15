"use client"

import * as React from "react"

import { DEFAULT_ACCOUNT_ID, normalizeNote } from "@/lib/accounts"
import {
  STORAGE_KEY,
  type NewTransaction,
  type Transaction,
  type TransactionPatch,
  type TransactionType,
} from "@/lib/transactions"

/**
 * Cash is the implicit account, so it is stored as "no accountId". That keeps
 * old and new Cash entries identical and the stored JSON small.
 */
function normalizeAccountId(accountId: string | undefined) {
  return accountId && accountId !== DEFAULT_ACCOUNT_ID ? accountId : undefined
}

export function useTransactions() {
  const [transactions, setTransactions] = React.useState<Transaction[]>([])
  const [isLoaded, setIsLoaded] = React.useState(false)

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) setTransactions(JSON.parse(raw))
    } catch {
      // ignore malformed storage
    } finally {
      setIsLoaded(true)
    }
  }, [])

  React.useEffect(() => {
    if (!isLoaded) return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions))
  }, [transactions, isLoaded])

  const addTransactions = React.useCallback(
    (entries: NewTransaction[]) => {
      const now = Date.now()
      const created: Transaction[] = entries.map((entry, index) => {
        const transaction: Transaction = {
          id: `${now}-${index}-${Math.random().toString(36).slice(2, 8)}`,
          createdAt: entry.createdAt ?? now,
          type: entry.type,
          category: entry.category,
          amount: entry.amount,
        }
        // Only set the optional fields when present, so plain entries keep
        // the exact shape they had before notes and accounts existed.
        const note = normalizeNote(entry.note)
        if (note) transaction.note = note
        const accountId = normalizeAccountId(entry.accountId)
        if (accountId) transaction.accountId = accountId
        return transaction
      })
      setTransactions((prev) => [...created, ...prev])
      // Returning the created rows lets callers reference their ids.
      return created
    },
    []
  )

  const removeTransaction = React.useCallback((id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const updateTransaction = React.useCallback(
    (id: string, patch: TransactionPatch) => {
      const normalized: TransactionPatch = { ...patch }
      if ("note" in patch) normalized.note = normalizeNote(patch.note)
      if ("accountId" in patch) normalized.accountId = normalizeAccountId(patch.accountId)
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...normalized } : t)),
      )
    },
    [],
  )

  /**
   * Moves every entry of one account to another (undefined = Cash). Used when
   * an account is deleted, so its income and expenses stay in the totals.
   */
  const reassignAccount = React.useCallback(
    (fromAccountId: string, toAccountId?: string) => {
      const target = normalizeAccountId(toAccountId)
      setTransactions((prev) =>
        prev.map((t) => {
          if (t.accountId !== fromAccountId) return t
          const { accountId: _old, ...rest } = t
          void _old
          return target ? { ...rest, accountId: target } : rest
        }),
      )
    },
    [],
  )

  /**
   * Rewrites the category label on past entries when a category is renamed.
   * Without this the history rows, the category icons and any spending
   * target would keep pointing at a label that no longer exists.
   */
  const renameCategory = React.useCallback(
    (type: TransactionType, fromLabel: string, toLabel: string) => {
      if (fromLabel === toLabel) return
      setTransactions((prev) =>
        prev.map((t) =>
          t.type === type && t.category === fromLabel
            ? { ...t, category: toLabel }
            : t,
        ),
      )
    },
    [],
  )

  return {
    transactions,
    addTransactions,
    removeTransaction,
    updateTransaction,
    renameCategory,
    reassignAccount,
    isLoaded,
  }
}
