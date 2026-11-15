"use client"

import * as React from "react"

import { useLocalStorageJson } from "@/hooks/use-local-storage"
import {
  applyRemoveTarget,
  applyTargetLabel,
  applyTargetOverride,
  applyUpsertTarget,
  cleanTargetOverrides,
  type CategoryTarget,
  type TargetInput,
} from "@/lib/targets"
import { TARGETS_STORAGE_KEY } from "@/lib/transactions"

/**
 * localStorage is user editable and survives app upgrades, so anything read
 * back has to be validated before it reaches the rest of the app.
 */
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
      overrides: cleanTargetOverrides(target.overrides),
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

/** Targets kept in this browser's localStorage (used when sign-in is off). */
export function useLocalTargets() {
  const [targets, setTargets] = useLocalStorageJson<CategoryTarget[]>(
    TARGETS_STORAGE_KEY,
    parseTargets,
    EMPTY_TARGETS,
  )

  const upsertTarget = React.useCallback(
    (input: TargetInput) => {
      const now = Date.now()
      setTargets((prev) => applyUpsertTarget(prev, input, now))
    },
    [setTargets],
  )

  const removeTarget = React.useCallback(
    (categoryKey: string) => {
      setTargets((prev) => applyRemoveTarget(prev, categoryKey))
    },
    [setTargets],
  )

  const setTargetOverride = React.useCallback(
    (categoryKey: string, month: string, amount: number | undefined) => {
      setTargets((prev) =>
        applyTargetOverride(prev, categoryKey, month, amount, Date.now()),
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
        applyTargetLabel(prev, categoryKey, categoryLabel, Date.now()),
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
