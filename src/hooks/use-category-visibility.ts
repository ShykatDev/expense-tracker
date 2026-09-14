"use client"

import * as React from "react"

import {
  CATEGORY_VISIBILITY_STORAGE_KEY,
  type TransactionType,
} from "@/lib/transactions"

type HiddenCategories = Record<TransactionType, string[]>

const EMPTY: HiddenCategories = { income: [], expense: [] }

export function useCategoryVisibility() {
  const [hidden, setHidden] = React.useState<HiddenCategories>(EMPTY)
  const [isLoaded, setIsLoaded] = React.useState(false)

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CATEGORY_VISIBILITY_STORAGE_KEY)
      if (raw) setHidden({ ...EMPTY, ...JSON.parse(raw) })
    } catch {
      // ignore malformed storage
    } finally {
      setIsLoaded(true)
    }
  }, [])

  React.useEffect(() => {
    if (!isLoaded) return
    window.localStorage.setItem(
      CATEGORY_VISIBILITY_STORAGE_KEY,
      JSON.stringify(hidden),
    )
  }, [hidden, isLoaded])

  const toggleCategory = React.useCallback(
    (type: TransactionType, key: string) => {
      setHidden((prev) => {
        const set = new Set(prev[type])
        if (set.has(key)) set.delete(key)
        else set.add(key)
        return { ...prev, [type]: Array.from(set) }
      })
    },
    [],
  )

  return { hidden, toggleCategory }
}
