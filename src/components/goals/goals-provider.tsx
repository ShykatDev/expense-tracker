"use client";

import * as React from "react";

import { useGoals as useGoalsState } from "@/hooks/use-goals";

interface GoalsContextValue {
  goals: ReturnType<typeof useGoalsState>["goals"];
  completions: ReturnType<typeof useGoalsState>["completions"];
  addGoal: ReturnType<typeof useGoalsState>["addGoal"];
  updateGoal: ReturnType<typeof useGoalsState>["updateGoal"];
  removeGoal: ReturnType<typeof useGoalsState>["removeGoal"];
  completeGoal: ReturnType<typeof useGoalsState>["completeGoal"];
  reopenGoal: ReturnType<typeof useGoalsState>["reopenGoal"];
  isLoaded: boolean;
}

const GoalsContext = React.createContext<GoalsContextValue | null>(null);

/**
 * Storage keys that the savings rework made obsolete.
 *
 * Savings used to be a manually maintained pot and each goal had its own
 * contribution list. Both are now derived from the transaction ledger, so
 * the old keys are dead weight. They are dropped once, on the first mount.
 */
const OBSOLETE_STORAGE_KEYS = [
  "expense-tracker:savings",
  "expense-tracker:goal-contributions",
];

function dropObsoleteStorage() {
  for (const key of OBSOLETE_STORAGE_KEYS) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // A blocked storage API is not worth failing the app over.
    }
  }
}

/**
 * Single source of truth for goals across routes. Like the categories
 * provider, it lives in the root layout so the goals page and the dashboard
 * read the same instance.
 */
export function GoalsProvider({ children }: { children: React.ReactNode }) {
  const {
    goals,
    completions,
    addGoal,
    updateGoal,
    removeGoal,
    completeGoal,
    reopenGoal,
    isLoaded,
  } = useGoalsState();

  React.useEffect(() => {
    dropObsoleteStorage();
  }, []);

  const value = React.useMemo(
    () => ({
      goals,
      completions,
      addGoal,
      updateGoal,
      removeGoal,
      completeGoal,
      reopenGoal,
      isLoaded,
    }),
    [
      goals,
      completions,
      addGoal,
      updateGoal,
      removeGoal,
      completeGoal,
      reopenGoal,
      isLoaded,
    ],
  );

  return (
    <GoalsContext.Provider value={value}>{children}</GoalsContext.Provider>
  );
}

export function useGoals() {
  const context = React.useContext(GoalsContext);
  if (!context) {
    throw new Error("useGoals must be used within a GoalsProvider");
  }
  return context;
}
