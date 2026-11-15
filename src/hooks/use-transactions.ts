"use client"

import * as React from "react"

import {
  applyPatch,
  applyReassign,
  applyRename,
  createTransactions,
  normalizePatch,
} from "@/lib/transaction-ops"
import {
  STORAGE_KEY,
  type NewTransaction,
  type Transaction,
  type TransactionPatch,
  type TransactionType,
} from "@/lib/transactions"

/**
 * Transactions kept in this browser's localStorage. Used only while Google
 * sign-in isn't configured; once it is, `useRemoteTransactions` (Neon) takes
 * over with the same API.
 */
export function useLocalTransactions() {
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

  const addTransactions = React.useCallback((entries: NewTransaction[]) => {
    const created = createTransactions(entries)
    setTransactions((prev) => [...created, ...prev])
    // Returning the created rows lets callers reference their ids.
    return created
  }, [])

  const removeTransaction = React.useCallback((id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const updateTransaction = React.useCallback((id: string, patch: TransactionPatch) => {
    const normalized = normalizePatch(patch)
    setTransactions((prev) => prev.map((t) => (t.id === id ? applyPatch(t, normalized) : t)))
  }, [])

  /** Moves an account's entries to another account (undefined = Cash). */
  const reassignAccount = React.useCallback((fromAccountId: string, toAccountId?: string) => {
    setTransactions((prev) => applyReassign(prev, fromAccountId, toAccountId))
  }, [])

  /** Rewrites the category label on past entries when a category is renamed. */
  const renameCategory = React.useCallback(
    (type: TransactionType, fromLabel: string, toLabel: string) => {
      if (fromLabel === toLabel) return
      setTransactions((prev) => applyRename(prev, type, fromLabel, toLabel))
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
