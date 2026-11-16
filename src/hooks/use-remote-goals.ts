"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "@yusufceng1z/ding-react";

import { importGoalsAction } from "@/app/actions/goals";
import {
  addGoalAction,
  completeGoalAction,
  removeGoalAction,
  restoreGoalsAction,
  reopenGoalAction,
  reorderGoalsAction,
  updateGoalAction,
} from "@/lib/offline/queued-actions";
import { afterSync, isOfflineError } from "@/lib/offline/sync";
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
import { GOALS_STORAGE_KEY, GOAL_COMPLETIONS_STORAGE_KEY } from "@/lib/transactions";

export const GOALS_QUERY_KEY = ["goals"] as const;

/** Set once this browser's local goals have been uploaded to the account. */
const IMPORTED_FLAG_KEY = "expense-tracker:imported:goals";

interface GoalsData {
  goals: Goal[];
  completions: GoalCompletion[];
}

class SignedOutError extends Error {}

async function fetchGoals(): Promise<GoalsData> {
  const response = await fetch("/api/data/goals", { cache: "no-store" });
  if (response.status === 401) throw new SignedOutError("Signed out");
  if (!response.ok) throw new Error(`Couldn't load goals (${response.status})`);
  return response.json();
}

function readLocal<T>(key: string, sanitize: (parsed: unknown) => T[]): T[] {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? sanitize(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

/**
 * Goals and goal completions stored in Neon, with the same API as the
 * browser-storage hook so no screen has to change.
 *
 * Every change is optimistic: the list updates at once and the save runs in
 * the background. If the save fails, the list goes back to what it was and a
 * toast says so. Goal photos still live in this browser's IndexedDB; only
 * their ids are synced.
 */
export function useRemoteGoals() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: GOALS_QUERY_KEY,
    queryFn: () => afterSync(fetchGoals),
    retry: (count, error) =>
      !(error instanceof SignedOutError) && !isOfflineError(error) && count < 1,
  });

  const goals = query.data?.goals ?? EMPTY_GOALS;
  const completions = query.data?.completions ?? EMPTY_COMPLETIONS;

  /**
   * Applies `update` to the cached data now, then runs `save`. On failure the
   * data is restored and refetched so it matches the server again.
   */
  const optimistic = React.useCallback(
    (update: (data: GoalsData) => GoalsData, save: () => Promise<unknown>) => {
      void queryClient.cancelQueries({ queryKey: GOALS_QUERY_KEY });
      const previous = queryClient.getQueryData<GoalsData>(GOALS_QUERY_KEY);
      queryClient.setQueryData<GoalsData>(GOALS_QUERY_KEY, (data) =>
        update(data ?? { goals: EMPTY_GOALS, completions: EMPTY_COMPLETIONS }),
      );
      save().catch(() => {
        queryClient.setQueryData(GOALS_QUERY_KEY, previous);
        void queryClient.invalidateQueries({ queryKey: GOALS_QUERY_KEY });
        toast.error("That change couldn’t be saved, so it was undone.");
      });
    },
    [queryClient],
  );

  const addGoal = React.useCallback(
    (input: NewGoal) => {
      // Read from the cache rather than a render's `goals`, so two quick adds
      // still get distinct places in the queue.
      const current = queryClient.getQueryData<GoalsData>(GOALS_QUERY_KEY)?.goals ?? [];
      const goal = createGoal(input, current);
      optimistic(
        (data) => ({ ...data, goals: [goal, ...data.goals] }),
        () => addGoalAction(goal),
      );
      // Returned straight away, so callers can keep the new id.
      return goal;
    },
    [optimistic, queryClient],
  );

  const updateGoal = React.useCallback(
    (id: string, patch: GoalPatch) => {
      const now = Date.now();
      optimistic(
        (data) => ({
          ...data,
          goals: data.goals.map((goal) => (goal.id === id ? applyGoalPatch(goal, patch, now) : goal)),
        }),
        () => updateGoalAction(id, patch),
      );
    },
    [optimistic],
  );

  /**
   * Sets the priority order: `orderedIds[0]` comes first. Goals not in the
   * list (completed ones, say) keep their order. Saved in one request.
   */
  const reorderGoals = React.useCallback(
    (orderedIds: string[]) => {
      optimistic(
        (data) => ({ ...data, goals: applyReorder(data.goals, orderedIds) }),
        () => reorderGoalsAction(orderedIds),
      );
    },
    [optimistic],
  );

  /** Puts a deleted goal and its completion records back, same ids (Undo). */
  const restoreGoal = React.useCallback(
    (goal: Goal, goalCompletions: GoalCompletion[]) => {
      optimistic(
        (data) => ({
          goals: data.goals.some((g) => g.id === goal.id) ? data.goals : [...data.goals, goal],
          completions: [
            ...goalCompletions.filter((c) => !data.completions.some((p) => p.id === c.id)),
            ...data.completions,
          ],
        }),
        () => restoreGoalsAction([goal], goalCompletions),
      );
    },
    [optimistic],
  );

  const removeGoal = React.useCallback(
    (id: string) => {
      optimistic(
        (data) => ({
          goals: data.goals.filter((goal) => goal.id !== id),
          // The database drops them by cascade; mirror that here.
          completions: data.completions.filter((entry) => entry.goalId !== id),
        }),
        () => removeGoalAction(id),
      );
    },
    [optimistic],
  );

  /**
   * Marks a goal as completed and records how it was fulfilled, so the
   * history can show where the money went.
   */
  const completeGoal = React.useCallback(
    (input: NewGoalCompletion) => {
      const completion = createCompletion(input);
      optimistic(
        (data) => ({
          goals: applyComplete(data.goals, input.goalId, completion.createdAt),
          completions: [completion, ...data.completions],
        }),
        () => completeGoalAction(completion),
      );
      return completion;
    },
    [optimistic],
  );

  /** Re-opens a completed goal so it can be worked on again. */
  const reopenGoal = React.useCallback(
    (id: string) => {
      optimistic(
        (data) => ({
          goals: applyReopen(data.goals, id),
          completions: data.completions.filter((entry) => entry.goalId !== id),
        }),
        () => reopenGoalAction(id),
      );
    },
    [optimistic],
  );

  // One-time import: goals saved in this browser before sign-in are uploaded
  // to the account once, goals before completions so every completion has
  // its goal. Ids are kept, so running it again can't duplicate anything.
  // The local copy stays as a backup until the browser-storage code goes.
  const importStarted = React.useRef(false);
  React.useEffect(() => {
    if (!query.isSuccess || importStarted.current) return;
    importStarted.current = true;
    try {
      if (window.localStorage.getItem(IMPORTED_FLAG_KEY)) return;
    } catch {
      return;
    }
    const localGoals = readLocal(GOALS_STORAGE_KEY, sanitizeGoals);
    const localCompletions = readLocal(GOAL_COMPLETIONS_STORAGE_KEY, sanitizeCompletions);
    const markDone = () => {
      try {
        window.localStorage.setItem(IMPORTED_FLAG_KEY, String(Date.now()));
      } catch {
        // Storage blocked: the import may run again, which is harmless.
      }
    };
    if (localGoals.length === 0 && localCompletions.length === 0) {
      markDone();
      return;
    }
    importGoalsAction(localGoals, localCompletions)
      .then(({ goals: inserted }) => {
        markDone();
        void queryClient.invalidateQueries({ queryKey: GOALS_QUERY_KEY });
        if (inserted > 0) {
          toast.success(
            `Moved ${inserted} ${inserted === 1 ? "goal" : "goals"} from this device to your account`,
          );
        }
      })
      .catch(() => {
        // Not marked done, so it's tried again next time the app opens.
        importStarted.current = false;
        toast.error("Couldn’t upload this device’s goals yet. It will retry next time.");
      });
  }, [query.isSuccess, queryClient]);

  // A failed first load (not just being signed out) is worth a toast.
  React.useEffect(() => {
    if (query.isError &&
      !(query.error instanceof SignedOutError) &&
      !isOfflineError(query.error)) {
      toast.error("Couldn’t load your goals. Reopen the app to try again.");
    }
  }, [query.isError, query.error]);

  return {
    goals,
    completions,
    addGoal,
    updateGoal,
    reorderGoals,
    removeGoal,
    restoreGoal,
    completeGoal,
    reopenGoal,
    isLoaded: !query.isPending,
  };
}

const EMPTY_GOALS: Goal[] = [];
const EMPTY_COMPLETIONS: GoalCompletion[] = [];
