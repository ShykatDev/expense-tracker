"use client"

import * as React from "react"

import {
  STORAGE_KEY,
  type Transaction,
  type TransactionType,
} from "@/lib/transactions"

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
    (entries: { type: TransactionType; category: string; amount: number }[]) => {
      const now = Date.now()
      setTransactions((prev) => [
        ...entries.map((entry, index) => ({
          id: `${now}-${index}-${Math.random().toString(36).slice(2, 8)}`,
          createdAt: now,
          ...entry,
        })),
        ...prev,
      ])
    },
    []
  )

  const removeTransaction = React.useCallback((id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const updateTransaction = React.useCallback(
    (id: string, patch: Partial<Pick<Transaction, "category" | "amount">>) => {
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      )
    },
    [],
  )

  return {
    transactions,
    addTransactions,
    removeTransaction,
    updateTransaction,
    isLoaded,
  }
}
