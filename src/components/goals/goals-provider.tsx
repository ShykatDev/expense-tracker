"use client";

import * as React from "react";

import { useLocalGoals } from "@/hooks/use-goals";
import { useRemoteGoals } from "@/hooks/use-remote-goals";

type GoalsState = ReturnType<typeof useLocalGoals>;

interface GoalsContextValue {
  goals: GoalsState["goals"];
  completions: GoalsState["completions"];
  addGoal: GoalsState["addGoal"];
  updateGoal: GoalsState["updateGoal"];
  reorderGoals: GoalsState["reorderGoals"];
  removeGoal: GoalsState["removeGoal"];
  /** Puts a deleted goal and its completion records back (Undo). */
  restoreGoal: GoalsState["restoreGoal"];
  completeGoal: GoalsState["completeGoal"];
  reopenGoal: GoalsState["reopenGoal"];
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

/** Memoized context value, so consumers only re-render when data changes. */
function useContextValue(state: GoalsState): GoalsContextValue {
  const {
    goals,
    completions,
    addGoal,
    updateGoal,
    reorderGoals,
    removeGoal,
    restoreGoal,
    completeGoal,
    reopenGoal,
    isLoaded,
  } = state;
  return React.useMemo(
    () => ({
      goals,
      completions,
      addGoal,
      updateGoal,
      reorderGoals,
      removeGoal,
      restoreGoal,
      completeGoal,
      reopenGoal,
      isLoaded,
    }),
    [
      goals,
      completions,
      addGoal,
      updateGoal,
      reorderGoals,
      removeGoal,
      restoreGoal,
      completeGoal,
      reopenGoal,
      isLoaded,
    ],
  );
}

function LocalGoalsProvider({ children }: { children: React.ReactNode }) {
  const value = useContextValue(useLocalGoals());
  return <GoalsContext.Provider value={value}>{children}</GoalsContext.Provider>;
}

function RemoteGoalsProvider({ children }: { children: React.ReactNode }) {
  const value: GoalsContextValue = useContextValue(useRemoteGoals());
  return <GoalsContext.Provider value={value}>{children}</GoalsContext.Provider>;
}

/**
 * Single source of truth for goals across routes. Like the categories
 * provider, it lives in the root layout so the goals page and the dashboard
 * read the same instance.
 *
 * `remote` is decided on the server: once Google sign-in and the database
 * are configured, goals live in Neon (and sync across devices); otherwise
 * they stay in this browser's localStorage. Both expose the same API, so no
 * screen knows which one it's talking to.
 */
export function GoalsProvider({
  remote = false,
  children,
}: {
  remote?: boolean;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    dropObsoleteStorage();
  }, []);

  return remote ? (
    <RemoteGoalsProvider>{children}</RemoteGoalsProvider>
  ) : (
    <LocalGoalsProvider>{children}</LocalGoalsProvider>
  );
}

export function useGoals() {
  const context = React.useContext(GoalsContext);
  if (!context) {
    throw new Error("useGoals must be used within a GoalsProvider");
  }
  return context;
}
