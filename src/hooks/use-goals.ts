"use client";

import * as React from "react";

import { useLocalStorageJson } from "@/hooks/use-local-storage";
import type { Goal, GoalCompletion, GoalCompletionSource } from "@/lib/goals";
import {
  GOALS_STORAGE_KEY,
  GOAL_COMPLETIONS_STORAGE_KEY,
} from "@/lib/transactions";

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
      status,
      createdAt:
        typeof value.createdAt === "number" ? value.createdAt : Date.now(),
      updatedAt:
        typeof value.updatedAt === "number" ? value.updatedAt : Date.now(),
    });
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
    }: {
      label: string
      targetAmount: number
      iconKey?: string
      targetDate?: number
    }) => {
      const now = Date.now()
      const goal: Goal = {
        id: crypto.randomUUID(),
        label: label.trim(),
        targetAmount,
        iconKey: iconKey || undefined,
        targetDate,
        status: "active",
        createdAt: now,
        updatedAt: now,
      }
      setGoals((prev) => [goal, ...prev])
      return goal
    },
    [setGoals],
  )

  const updateGoal = React.useCallback(
    (
      id: string,
      patch: Partial<
        Pick<
          Goal,
          "label" | "targetAmount" | "iconKey" | "targetDate" | "status"
        >
      >,
    ) => {
      setGoals((prev) =>
        prev.map((goal) =>
          goal.id === id ? { ...goal, ...patch, updatedAt: Date.now() } : goal,
        ),
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
        id: crypto.randomUUID(),
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
            ? { ...goal, status: "active", updatedAt: Date.now() }
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
    removeGoal,
    completeGoal,
    reopenGoal,
    isLoaded: true,
  }
}
