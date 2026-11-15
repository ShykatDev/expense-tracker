"use client";

import * as React from "react";

import { useLocalStorageJson } from "@/hooks/use-local-storage";
import {
  nextGoalOrder,
  sortGoalsByPriority,
  type Goal,
  type GoalCompletion,
  type GoalCompletionSource,
  type GoalPriceChange,
} from "@/lib/goals";
import {
  GOALS_STORAGE_KEY,
  GOAL_COMPLETIONS_STORAGE_KEY,
} from "@/lib/transactions";
import { createId } from "@/lib/id"

/** Keeps well-formed entries; drops the field when nothing valid is left. */
function sanitizePriceHistory(value: unknown): GoalPriceChange[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const history = value.filter(
    (entry): entry is GoalPriceChange =>
      !!entry &&
      typeof entry === "object" &&
      typeof entry.amount === "number" &&
      Number.isFinite(entry.amount) &&
      entry.amount > 0 &&
      typeof entry.changedAt === "number" &&
      Number.isFinite(entry.changedAt),
  );
  return history.length
    ? history.map(({ amount, changedAt }) => ({ amount, changedAt }))
    : undefined;
}

/** Older price changes are dropped past this, keeping the original price. */
const MAX_PRICE_HISTORY = 20;

function sanitizeGoals(parsed: unknown): Goal[] {
  if (!Array.isArray(parsed)) return [];

  const goals: Goal[] = [];
  for (const entry of parsed) {
    if (!entry || typeof entry !== "object") continue;

    const value = entry as Partial<Goal>;
    if (typeof value.id !== "string" || !value.id) continue;
    if (typeof value.label !== "string" || !value.label.trim()) continue;
    if (
      typeof value.targetAmount !== "number" ||
      !Number.isFinite(value.targetAmount) ||
      value.targetAmount <= 0
    ) {
      continue;
    }

    const status =
      value.status === "completed" || value.status === "archived"
        ? value.status
        : "active";

    goals.push({
      id: value.id,
      label: value.label.trim(),
      targetAmount: value.targetAmount,
      iconKey: typeof value.iconKey === "string" ? value.iconKey : undefined,
      targetDate:
        typeof value.targetDate === "number" ? value.targetDate : undefined,
      links: Array.isArray(value.links)
        ? value.links.filter((link): link is string => typeof link === "string" && !!link)
        : undefined,
      imageId: typeof value.imageId === "string" ? value.imageId : undefined,
      order:
        typeof value.order === "number" && Number.isFinite(value.order)
          ? value.order
          : undefined,
      priceHistory: sanitizePriceHistory(value.priceHistory),
      status,
      createdAt:
        typeof value.createdAt === "number" ? value.createdAt : Date.now(),
      updatedAt:
        typeof value.updatedAt === "number" ? value.updatedAt : Date.now(),
    });
  }

  // Goals saved before priorities existed have no order. Give them one
  // after any ordered goals, oldest first, so the list has a stable order
  // to start reordering from.
  if (goals.some((goal) => goal.order === undefined)) {
    let next = nextGoalOrder(goals);
    for (const goal of sortGoalsByPriority(goals)) {
      if (goal.order === undefined) goal.order = next++;
    }
  }
  return goals;
}

function sanitizeCompletions(parsed: unknown): GoalCompletion[] {
  if (!Array.isArray(parsed)) return [];

  const completions: GoalCompletion[] = [];
  for (const entry of parsed) {
    if (!entry || typeof entry !== "object") continue;

    const value = entry as Partial<GoalCompletion>;
    if (typeof value.id !== "string" || !value.id) continue;
    if (typeof value.goalId !== "string" || !value.goalId) continue;
    if (value.source !== "savings" && value.source !== "gift") continue;
    if (
      typeof value.amount !== "number" ||
      !Number.isFinite(value.amount) ||
      value.amount <= 0
    ) {
      continue
    }

    completions.push({
      id: value.id,
      goalId: value.goalId,
      source: value.source,
      amount: value.amount,
      transactionId:
        typeof value.transactionId === "string"
          ? value.transactionId
          : undefined,
      createdAt:
        typeof value.createdAt === "number" ? value.createdAt : Date.now(),
    });
  }
  return completions;
}

function parseGoals(raw: string) {
  try {
    return sanitizeGoals(JSON.parse(raw))
  } catch {
    return []
  }
}

function parseCompletions(raw: string) {
  try {
    return sanitizeCompletions(JSON.parse(raw))
  } catch {
    return []
  }
}

const EMPTY_GOALS: Goal[] = []
const EMPTY_COMPLETIONS: GoalCompletion[] = []

export function useGoals() {
  const [goals, setGoals] = useLocalStorageJson<Goal[]>(
    GOALS_STORAGE_KEY,
    parseGoals,
    EMPTY_GOALS,
  )

  const [completions, setCompletions] = useLocalStorageJson<GoalCompletion[]>(
    GOAL_COMPLETIONS_STORAGE_KEY,
    parseCompletions,
    EMPTY_COMPLETIONS,
  )

  const addGoal = React.useCallback(
    ({
      label,
      targetAmount,
      iconKey,
      targetDate,
      links,
      imageId,
    }: {
      label: string
      targetAmount: number
      iconKey?: string
      targetDate?: number
      links?: string[]
      imageId?: string
    }) => {
      const now = Date.now()
      const goal: Goal = {
        id: createId(),
        // New goals join the end of the queue.
        order: nextGoalOrder(goals),
        label: label.trim(),
        targetAmount,
        iconKey: iconKey || undefined,
        targetDate,
        links: links?.length ? links : undefined,
        imageId,
        status: "active",
        createdAt: now,
        updatedAt: now,
      }
      setGoals((prev) => [goal, ...prev])
      return goal
    },
    [goals, setGoals],
  )

  const updateGoal = React.useCallback(
    (
      id: string,
      patch: Partial<
        Pick<
          Goal,
          | "label"
          | "targetAmount"
          | "iconKey"
          | "targetDate"
          | "links"
          | "imageId"
          | "status"
          | "order"
        >
      >,
    ) => {
      const now = Date.now()
      setGoals((prev) =>
        prev.map((goal) => {
          if (goal.id !== id) return goal
          // A new price records the old one, so the card can show how the
          // price moved since the goal was added.
          let priceHistory = goal.priceHistory
          if (
            patch.targetAmount !== undefined &&
            patch.targetAmount !== goal.targetAmount
          ) {
            const all = [
              ...(goal.priceHistory ?? []),
              { amount: goal.targetAmount, changedAt: now },
            ]
            priceHistory =
              all.length > MAX_PRICE_HISTORY
                ? [all[0], ...all.slice(all.length - MAX_PRICE_HISTORY + 1)]
                : all
          }
          return { ...goal, ...patch, priceHistory, updatedAt: now }
        }),
      )
    },
    [setGoals],
  )

  /**
   * Sets the priority order: `orderedIds[0]` comes first. Goals not in the
   * list (completed ones, say) keep their order.
   */
  const reorderGoals = React.useCallback(
    (orderedIds: string[]) => {
      const position = new Map(orderedIds.map((id, index) => [id, index]))
      setGoals((prev) =>
        prev.map((goal) => {
          const order = position.get(goal.id)
          return order === undefined || order === goal.order
            ? goal
            : { ...goal, order }
        }),
      )
    },
    [setGoals],
  )

  const removeGoal = React.useCallback(
    (id: string) => {
      setGoals((prev) => prev.filter((goal) => goal.id !== id))
      // Drop the goal's completion records in the same pass so the two keys
      // can never disagree about which completions belong to a live goal.
      setCompletions((prev) => prev.filter((entry) => entry.goalId !== id))
    },
    [setGoals, setCompletions],
  )

  /**
   * Marks a goal as completed and records how it was fulfilled, so the
   * history can show where the money went.
   */
  const completeGoal = React.useCallback(
    ({
      goalId,
      source,
      amount,
      transactionId,
    }: {
      goalId: string
      source: GoalCompletionSource
      amount: number
      transactionId?: string
    }) => {
      const completion: GoalCompletion = {
        id: createId(),
        goalId,
        source,
        amount,
        transactionId,
        createdAt: Date.now(),
      }
      setCompletions((prev) => [completion, ...prev])
      setGoals((prev) =>
        prev.map((goal) =>
          goal.id === goalId
            ? { ...goal, status: "completed", updatedAt: Date.now() }
            : goal,
        ),
      )
      return completion
    },
    [setCompletions, setGoals],
  )

  /** Re-opens a completed goal so it can be worked on again. */
  const reopenGoal = React.useCallback(
    (id: string) => {
      setGoals((prev) =>
        prev.map((goal) =>
          goal.id === id
            ? {
                ...goal,
                status: "active",
                // Back of the queue, so it can't silently jump ahead of
                // goals the user has since put in order.
                order: nextGoalOrder(prev),
                updatedAt: Date.now(),
              }
            : goal,
        ),
      )
      setCompletions((prev) => prev.filter((entry) => entry.goalId !== id))
    },
    [setGoals, setCompletions],
  )

  return {
    goals,
    completions,
    addGoal,
    updateGoal,
    reorderGoals,
    removeGoal,
    completeGoal,
    reopenGoal,
    isLoaded: true,
  }
}
