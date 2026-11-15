"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "@yusufceng1z/ding-react";

import {
  addRecurringRuleAction,
  importRecurringRulesAction,
  removeRecurringRuleAction,
  updateRecurringRuleAction,
} from "@/app/actions/recurring";
import { createId } from "@/lib/id";
import {
  RECURRING_STORAGE_KEY,
  applyPaused,
  applyRuleInput,
  createRule,
  markHandled,
  sanitizeRules,
  type RecurringRule,
  type RecurringRuleInput,
} from "@/lib/recurring";

export const RECURRING_QUERY_KEY = ["recurring"] as const;

/** Set once this browser's local rules have been uploaded to the account. */
const IMPORTED_FLAG_KEY = "expense-tracker:imported:recurring";

class SignedOutError extends Error {}

async function fetchRules(): Promise<RecurringRule[]> {
  const response = await fetch("/api/data/recurring", { cache: "no-store" });
  if (response.status === 401) throw new SignedOutError("Signed out");
  if (!response.ok) throw new Error(`Couldn't load recurring rules (${response.status})`);
  return response.json();
}

function readLocalRules(): RecurringRule[] {
  try {
    const raw = window.localStorage.getItem(RECURRING_STORAGE_KEY);
    return raw ? sanitizeRules(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

/**
 * Recurring rules stored in Neon, with the same API as the browser-storage
 * hook so no screen has to change.
 *
 * Every change is computed here, with the same pure functions the local hook
 * uses (period keys depend on the user's time zone), applied to the cache at
 * once and saved in the background. If the save fails, the list goes back to
 * what it was and a toast says so.
 */
export function useRemoteRecurringRules() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: RECURRING_QUERY_KEY,
    queryFn: fetchRules,
    retry: (count, error) => !(error instanceof SignedOutError) && count < 1,
  });

  const rules = query.data ?? EMPTY;

  /**
   * Applies `update` to the cached list now, then runs `save`. On failure the
   * list is restored and refetched so it matches the server again.
   */
  const optimistic = React.useCallback(
    (update: (list: RecurringRule[]) => RecurringRule[], save: () => Promise<unknown>) => {
      void queryClient.cancelQueries({ queryKey: RECURRING_QUERY_KEY });
      const previous = queryClient.getQueryData<RecurringRule[]>(RECURRING_QUERY_KEY);
      queryClient.setQueryData<RecurringRule[]>(RECURRING_QUERY_KEY, (list) => update(list ?? []));
      save().catch(() => {
        queryClient.setQueryData(RECURRING_QUERY_KEY, previous);
        void queryClient.invalidateQueries({ queryKey: RECURRING_QUERY_KEY });
        toast.error("Couldn’t save that change. Check your connection and try again.");
      });
    },
    [queryClient],
  );

  /**
   * Computes one rule's next state from the latest cached copy (not the
   * rendered one, so two quick changes build on each other) and saves it
   * whole. Does nothing when the rule is gone or unchanged.
   */
  const changeRule = React.useCallback(
    (id: string, change: (rule: RecurringRule) => RecurringRule) => {
      const list = queryClient.getQueryData<RecurringRule[]>(RECURRING_QUERY_KEY) ?? [];
      const current = list.find((rule) => rule.id === id);
      if (!current) return;
      const next = change(current);
      if (next === current) return;
      optimistic(
        (cached) => cached.map((rule) => (rule.id === id ? next : rule)),
        () => updateRecurringRuleAction(next),
      );
    },
    [optimistic, queryClient],
  );

  const addRule = React.useCallback(
    (input: RecurringRuleInput) => {
      const rule = createRule(input, createId());
      optimistic((list) => [rule, ...list], () => addRecurringRuleAction(rule));
      // Returned straight away, so callers can keep the new id.
      return rule;
    },
    [optimistic],
  );

  const updateRule = React.useCallback(
    (id: string, input: RecurringRuleInput) => {
      changeRule(id, (rule) => applyRuleInput(rule, input));
    },
    [changeRule],
  );

  const removeRule = React.useCallback(
    (id: string) => {
      optimistic(
        (list) => list.filter((rule) => rule.id !== id),
        () => removeRecurringRuleAction(id),
      );
    },
    [optimistic],
  );

  /** See `applyPaused`: resuming settles everything before today. */
  const setPaused = React.useCallback(
    (id: string, paused: boolean) => {
      changeRule(id, (rule) => applyPaused(rule, paused));
    },
    [changeRule],
  );

  /** Marks one occurrence as confirmed or skipped. */
  const markOccurrenceHandled = React.useCallback(
    (id: string, periodKey: string) => {
      changeRule(id, (rule) => markHandled(rule, periodKey));
    },
    [changeRule],
  );

  // One-time import: rules saved in this browser before sign-in are uploaded
  // to the account once. Ids are kept, so running it again (another tab, a
  // retry) can't duplicate anything. The local copy stays as a backup until
  // the browser-storage code is removed.
  const importStarted = React.useRef(false);
  React.useEffect(() => {
    if (!query.isSuccess || importStarted.current) return;
    importStarted.current = true;
    try {
      if (window.localStorage.getItem(IMPORTED_FLAG_KEY)) return;
    } catch {
      return;
    }
    const local = readLocalRules();
    const markDone = () => {
      try {
        window.localStorage.setItem(IMPORTED_FLAG_KEY, String(Date.now()));
      } catch {
        // Storage blocked: the import may run again, which is harmless.
      }
    };
    if (local.length === 0) {
      markDone();
      return;
    }
    importRecurringRulesAction(local)
      .then(({ inserted }) => {
        markDone();
        void queryClient.invalidateQueries({ queryKey: RECURRING_QUERY_KEY });
        if (inserted > 0) {
          toast.success(
            `Moved ${inserted} recurring ${inserted === 1 ? "rule" : "rules"} from this device to your account`,
          );
        }
      })
      .catch(() => {
        // Not marked done, so it's tried again next time the app opens.
        importStarted.current = false;
        toast.error("Couldn’t upload this device’s recurring rules yet. It will retry next time.");
      });
  }, [query.isSuccess, queryClient]);

  // A failed first load (not just being signed out) is worth a toast.
  React.useEffect(() => {
    if (query.isError && !(query.error instanceof SignedOutError)) {
      toast.error("Couldn’t load your recurring rules. Reopen the app to try again.");
    }
  }, [query.isError, query.error]);

  return {
    rules,
    addRule,
    updateRule,
    removeRule,
    setPaused,
    markOccurrenceHandled,
    isLoaded: !query.isPending,
  };
}

const EMPTY: RecurringRule[] = [];
