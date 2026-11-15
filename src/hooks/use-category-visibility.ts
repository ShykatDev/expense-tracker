"use client"

import * as React from "react"

import {
  EMPTY_HIDDEN_CATEGORIES,
  isCategoryHidden,
  sanitizeHiddenCategories,
  setCategoryHidden,
  type HiddenCategories,
} from "@/lib/categories-ops"
import {
  CATEGORY_VISIBILITY_STORAGE_KEY,
  type TransactionType,
} from "@/lib/transactions"

export type { HiddenCategories }

/** Reads this browser's hidden categories, validated. Empty when unreadable. */
export function readLocalHiddenCategories(): HiddenCategories {
  try {
    const raw = window.localStorage.getItem(CATEGORY_VISIBILITY_STORAGE_KEY)
    return raw ? sanitizeHiddenCategories(JSON.parse(raw)) : EMPTY_HIDDEN_CATEGORIES
  } catch {
    return EMPTY_HIDDEN_CATEGORIES
  }
}

/** Which categories are hidden from the entry screen, in this browser. */
export function useLocalCategoryVisibility() {
  const [hidden, setHidden] = React.useState<HiddenCategories>(EMPTY_HIDDEN_CATEGORIES)
  const [isLoaded, setIsLoaded] = React.useState(false)

  React.useEffect(() => {
    setHidden(readLocalHiddenCategories())
    setIsLoaded(true)
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
      setHidden((prev) =>
        setCategoryHidden(prev, type, key, !isCategoryHidden(prev, type, key)),
      )
    },
    [],
  )

  return { hidden, toggleCategory }
}
