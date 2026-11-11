"use client"

import * as React from "react"

import { useLocalStorageJson } from "@/hooks/use-local-storage"
import { isMonthKey, type CategoryTarget } from "@/lib/targets"
import { TARGETS_STORAGE_KEY } from "@/lib/transactions"

/**
 * localStorage is user editable and survives app upgrades, so anything read
 * back has to be validated before it reaches the rest of the app.
 */
function sanitizeOverrides(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") return {}

  const overrides: Record<string, number> = {}
  for (const [key, amount] of Object.entries(value as Record<string, unknown>)) {
    if (!isMonthKey(key)) continue
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
      continue
    }
    overrides[key] = amount
  }
  return overrides
}

function sanitizeTargets(parsed: unknown): CategoryTarget[] {
  if (!Array.isArray(parsed)) return []

  const byKey = new Map<string, CategoryTarget>()
  for (const entry of parsed) {
    if (!entry || typeof entry !== "object") continue

    const target = entry as Partial<CategoryTarget>
    if (typeof target.categoryKey !== "string" || !target.categoryKey.trim()) {
      continue
    }
    if (
      typeof target.categoryLabel !== "string" ||
      !target.categoryLabel.trim()
    ) {
      continue
    }
    if (
      typeof target.amount !== "number" ||
      !Number.isFinite(target.amount) ||
      target.amount <= 0
    ) {
      continue
    }

    const now = Date.now()
    byKey.set(target.categoryKey, {
      categoryKey: target.categoryKey,
      categoryLabel: target.categoryLabel.trim(),
      amount: target.amount,
      overrides: sanitizeOverrides(target.overrides),
      createdAt: typeof target.createdAt === "number" ? target.createdAt : now,
      updatedAt: typeof target.updatedAt === "number" ? target.updatedAt : now,
    })
  }

  return Array.from(byKey.values())
}

function parseTargets(raw: string) {
  try {
    return sanitizeTargets(JSON.parse(raw))
  } catch {
    return []
  }
}

const EMPTY_TARGETS: CategoryTarget[] = []

export function useTargets() {
  const [targets, setTargets] = useLocalStorageJson<CategoryTarget[]>(
    TARGETS_STORAGE_KEY,
    parseTargets,
    EMPTY_TARGETS,
  )

  const upsertTarget = React.useCallback(
    ({
      categoryKey,
      categoryLabel,
      amount,
      overrides,
    }: {
      categoryKey: string
      categoryLabel: string
      amount: number
      overrides?: Record<string, number>
    }) => {
      const now = Date.now()
      setTargets((prev) => {
        const existing = prev.find((t) => t.categoryKey === categoryKey)
        const next: CategoryTarget = {
          categoryKey,
          categoryLabel: categoryLabel.trim(),
          amount,
          overrides: overrides ?? existing?.overrides ?? {},
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        }
        return existing
          ? prev.map((t) => (t.categoryKey === categoryKey ? next : t))
          : [...prev, next]
      })
    },
    [setTargets],
  )

  const removeTarget = React.useCallback(
    (categoryKey: string) => {
      setTargets((prev) => prev.filter((t) => t.categoryKey !== categoryKey))
    },
    [setTargets],
  )

  const setTargetOverride = React.useCallback(
    (categoryKey: string, month: string, amount: number | undefined) => {
      setTargets((prev) =>
        prev.map((target) => {
          if (target.categoryKey !== categoryKey) return target

          const overrides = { ...target.overrides }
          if (amount === undefined) delete overrides[month]
          else overrides[month] = amount

          return { ...target, overrides, updatedAt: Date.now() }
        }),
      )
    },
    [setTargets],
  )

  /**
   * Keeps the cached label in step with a category rename, so the target
   * still matches the transactions that carry the new label.
   */
  const renameTargetLabel = React.useCallback(
    (categoryKey: string, categoryLabel: string) => {
      setTargets((prev) =>
        prev.map((target) =>
          target.categoryKey === categoryKey
            ? {
                ...target,
                categoryLabel: categoryLabel.trim(),
                updatedAt: Date.now(),
              }
            : target,
        ),
      )
    },
    [setTargets],
  )

  return {
    targets,
    upsertTarget,
    removeTarget,
    setTargetOverride,
    renameTargetLabel,
    isLoaded: true,
  }
}
