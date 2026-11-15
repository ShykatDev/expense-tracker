"use client";

import * as React from "react";

import { useLocalStorageJson } from "@/hooks/use-local-storage";
import {
  applyComplete,
  applyGoalPatch,
  applyReopen,
  applyReorder,
  createCompletion,
  createGoal,
  sanitizeCompletions,
  sanitizeGoals,
  type GoalPatch,
  type NewGoal,
  type NewGoalCompletion,
} from "@/lib/goal-ops";
import type { Goal, GoalCompletion } from "@/lib/goals";
import {
  GOALS_STORAGE_KEY,
  GOAL_COMPLETIONS_STORAGE_KEY,
} from "@/lib/transactions";

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

/** Goals kept in this browser's localStorage (used when sign-in is off). */
export function useLocalGoals() {
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
    (input: NewGoal) => {
      const goal = createGoal(input, goals)
      setGoals((prev) => [goal, ...prev])
      return goal
    },
    [goals, setGoals],
  )

  const updateGoal = React.useCallback(
    (id: string, patch: GoalPatch) => {
      const now = Date.now()
      setGoals((prev) =>
        prev.map((goal) => (goal.id === id ? applyGoalPatch(goal, patch, now) : goal)),
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
      setGoals((prev) => applyReorder(prev, orderedIds))
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
    (input: NewGoalCompletion) => {
      const completion = createCompletion(input)
      setCompletions((prev) => [completion, ...prev])
      setGoals((prev) => applyComplete(prev, input.goalId))
      return completion
    },
    [setCompletions, setGoals],
  )

  /** Re-opens a completed goal so it can be worked on again. */
  const reopenGoal = React.useCallback(
    (id: string) => {
      setGoals((prev) => applyReopen(prev, id))
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
