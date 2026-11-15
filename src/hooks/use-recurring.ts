"use client";

import * as React from "react";

import { useLocalStorageJson } from "@/hooks/use-local-storage";
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

/** The fields the rule dialog edits. Lives in lib so both stores share it. */
export type { RecurringRuleInput };

function parseRules(raw: string) {
  try {
    return sanitizeRules(JSON.parse(raw));
  } catch {
    return [];
  }
}

const EMPTY_RULES: RecurringRule[] = [];

/**
 * The recurring rules, persisted to localStorage. Used only while Google
 * sign-in isn't configured; once it is, `useRemoteRecurringRules` (Neon)
 * takes over with the same API.
 *
 * Only bookkeeping lives here; writing a confirmed occurrence to the ledger
 * is the provider's job, since it needs the transactions context.
 */
export function useLocalRecurringRules() {
  const [rules, setRules] = useLocalStorageJson<RecurringRule[]>(
    RECURRING_STORAGE_KEY,
    parseRules,
    EMPTY_RULES,
  );

  const addRule = React.useCallback(
    (input: RecurringRuleInput) => {
      const rule = createRule(input, createId());
      setRules((prev) => [rule, ...prev]);
      return rule;
    },
    [setRules],
  );

  const updateRule = React.useCallback(
    (id: string, input: RecurringRuleInput) => {
      setRules((prev) => prev.map((rule) => (rule.id === id ? applyRuleInput(rule, input) : rule)));
    },
    [setRules],
  );

  const removeRule = React.useCallback(
    (id: string) => {
      setRules((prev) => prev.filter((rule) => rule.id !== id));
    },
    [setRules],
  );

  /** See `applyPaused`: resuming settles everything before today. */
  const setPaused = React.useCallback(
    (id: string, paused: boolean) => {
      setRules((prev) => prev.map((rule) => (rule.id === id ? applyPaused(rule, paused) : rule)));
    },
    [setRules],
  );

  /** Marks one occurrence as confirmed or skipped. */
  const markOccurrenceHandled = React.useCallback(
    (id: string, periodKey: string) => {
      setRules((prev) =>
        prev.map((rule) => (rule.id === id ? markHandled(rule, periodKey) : rule)),
      );
    },
    [setRules],
  );

  return {
    rules,
    addRule,
    updateRule,
    removeRule,
    setPaused,
    markOccurrenceHandled,
    isLoaded: true,
  };
}
