"use client";

import * as React from "react";

import { useLocalStorageJson } from "@/hooks/use-local-storage";
import { createId } from "@/lib/id";
import {
  RECURRING_STORAGE_KEY,
  clampDayOfMonth,
  markHandled,
  sanitizeRules,
  settleBefore,
  startOfDay,
  type RecurringFrequency,
  type RecurringRule,
} from "@/lib/recurring";
import type { TransactionType } from "@/lib/transactions";

/** The fields the rule dialog edits. */
export interface RecurringRuleInput {
  type: TransactionType;
  category: string;
  amount: number;
  frequency: RecurringFrequency;
  dayOfMonth: number;
  startDate: number;
  note?: string;
}

function parseRules(raw: string) {
  try {
    return sanitizeRules(JSON.parse(raw));
  } catch {
    return [];
  }
}

const EMPTY_RULES: RecurringRule[] = [];

function normalizeInput(input: RecurringRuleInput) {
  return {
    type: input.type,
    category: input.category.trim(),
    amount: input.amount,
    frequency: input.frequency,
    dayOfMonth: clampDayOfMonth(input.dayOfMonth),
    startDate: startOfDay(input.startDate),
    note: input.note?.trim() || undefined,
  };
}

/**
 * The recurring rules, persisted to localStorage. Only bookkeeping lives
 * here; writing a confirmed occurrence to the ledger is the provider's job,
 * since it needs the transactions context.
 */
export function useRecurringRules() {
  const [rules, setRules] = useLocalStorageJson<RecurringRule[]>(
    RECURRING_STORAGE_KEY,
    parseRules,
    EMPTY_RULES,
  );

  const addRule = React.useCallback(
    (input: RecurringRuleInput) => {
      const now = Date.now();
      const rule: RecurringRule = {
        id: createId(),
        ...normalizeInput(input),
        paused: false,
        handled: [],
        createdAt: now,
        updatedAt: now,
      };
      setRules((prev) => [rule, ...prev]);
      return rule;
    },
    [setRules],
  );

  const updateRule = React.useCallback(
    (id: string, input: RecurringRuleInput) => {
      setRules((prev) =>
        prev.map((rule) => {
          if (rule.id !== id) return rule;
          let next: RecurringRule = {
            ...rule,
            ...normalizeInput(input),
            updatedAt: Date.now(),
          };
          // Period keys differ between frequencies, so the old handled
          // record is meaningless; don't resurface the past either.
          if (next.frequency !== rule.frequency) {
            next = settleBefore(
              { ...next, settledThrough: undefined, handled: [] },
              Date.now(),
            );
          }
          return next;
        }),
      );
    },
    [setRules],
  );

  const removeRule = React.useCallback(
    (id: string) => {
      setRules((prev) => prev.filter((rule) => rule.id !== id));
    },
    [setRules],
  );

  /**
   * Pausing hides the rule's occurrences. Resuming settles everything dated
   * before today, so a long pause doesn't come back as a pile of overdue bills.
   */
  const setPaused = React.useCallback(
    (id: string, paused: boolean) => {
      setRules((prev) =>
        prev.map((rule) => {
          if (rule.id !== id || rule.paused === paused) return rule;
          const next = { ...rule, paused, updatedAt: Date.now() };
          return paused ? next : settleBefore(next, Date.now());
        }),
      );
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
