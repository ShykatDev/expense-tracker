"use client";

import * as React from "react";

import { useTransactions } from "@/components/dashboard/transactions-provider";
import { useRemoteRecurringRules } from "@/hooks/use-remote-recurring";
import {
  useLocalRecurringRules,
  type RecurringRuleInput,
} from "@/hooks/use-recurring";
import {
  dueOccurrences,
  isHandled,
  occurrenceTimestamp,
  startOfDay,
  type RecurringOccurrence,
  type RecurringRule,
} from "@/lib/recurring";

interface RecurringContextValue {
  rules: RecurringRule[];
  /** Due today or overdue, across all active rules, oldest first. */
  due: RecurringOccurrence[];
  /**
   * The moment "today" is measured from. Refreshed when the day rolls over or
   * the app comes back to the foreground, so a PWA left open overnight
   * still surfaces the morning's rent.
   */
  now: number;
  addRule: (input: RecurringRuleInput) => RecurringRule;
  updateRule: (id: string, input: RecurringRuleInput) => void;
  removeRule: (id: string) => void;
  setPaused: (id: string, paused: boolean) => void;
  /**
   * Writes the occurrence to the ledger, dated on its due day, and marks it
   * handled. `amount` overrides the rule's amount for this occurrence only.
   * Returns false if it was already handled (e.g. a double tap).
   */
  confirmOccurrence: (occurrence: RecurringOccurrence, amount?: number) => boolean;
  /** Marks the occurrence handled without adding anything. */
  skipOccurrence: (occurrence: RecurringOccurrence) => void;
  isLoaded: boolean;
}

const RecurringContext = React.createContext<RecurringContextValue | null>(null);

/** Keeps `now` on the current day without re-rendering every minute. */
function useToday() {
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    function refresh() {
      const next = Date.now();
      setNow((prev) => (startOfDay(prev) === startOfDay(next) ? prev : next));
    }
    const interval = window.setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return now;
}

type RecurringRulesState = ReturnType<typeof useLocalRecurringRules>;

/**
 * Everything above the raw rule store: today's due list, and confirming or
 * skipping an occurrence. Shared by both stores, so the double-confirm guard
 * and the ledger write behave the same either way. Returns the memoized
 * context value.
 */
function useContextValue(state: RecurringRulesState): RecurringContextValue {
  const {
    rules,
    addRule,
    updateRule,
    removeRule,
    setPaused,
    markOccurrenceHandled,
    isLoaded,
  } = state;
  const { addTransactions } = useTransactions();
  const now = useToday();

  const due = React.useMemo(() => dueOccurrences(rules, now), [rules, now]);

  // Writes update the store synchronously but the rendered `rules` lag a
  // frame, so a fast double tap could otherwise confirm the same occurrence twice.
  const rulesRef = React.useRef(rules);
  React.useEffect(() => {
    rulesRef.current = rules;
  }, [rules]);
  const inFlight = React.useRef(new Set<string>());

  const claim = React.useCallback((occurrence: RecurringOccurrence) => {
    const token = `${occurrence.ruleId}:${occurrence.periodKey}`;
    const rule = rulesRef.current.find((entry) => entry.id === occurrence.ruleId);
    if (!rule || isHandled(rule, occurrence.periodKey) || inFlight.current.has(token)) {
      return false;
    }
    inFlight.current.add(token);
    // Released once the write has rendered and isHandled takes over.
    window.setTimeout(() => inFlight.current.delete(token), 1000);
    return true;
  }, []);

  const confirmOccurrence = React.useCallback(
    (occurrence: RecurringOccurrence, amount?: number) => {
      if (!claim(occurrence)) return false;
      const value =
        amount !== undefined && Number.isFinite(amount) && amount > 0
          ? amount
          : occurrence.amount;
      addTransactions([
        {
          type: occurrence.type,
          category: occurrence.category,
          amount: value,
          createdAt: occurrenceTimestamp(occurrence.dueDate, Date.now()),
          note: occurrence.note,
        },
      ]);
      markOccurrenceHandled(occurrence.ruleId, occurrence.periodKey);
      return true;
    },
    [addTransactions, claim, markOccurrenceHandled],
  );

  const skipOccurrence = React.useCallback(
    (occurrence: RecurringOccurrence) => {
      if (!claim(occurrence)) return;
      markOccurrenceHandled(occurrence.ruleId, occurrence.periodKey);
    },
    [claim, markOccurrenceHandled],
  );

  const value = React.useMemo(
    () => ({
      rules,
      due,
      now,
      addRule,
      updateRule,
      removeRule,
      setPaused,
      confirmOccurrence,
      skipOccurrence,
      isLoaded,
    }),
    [
      rules,
      due,
      now,
      addRule,
      updateRule,
      removeRule,
      setPaused,
      confirmOccurrence,
      skipOccurrence,
      isLoaded,
    ],
  );

  return value;
}

function LocalRecurringProvider({ children }: { children: React.ReactNode }) {
  const value = useContextValue(useLocalRecurringRules());
  return <RecurringContext.Provider value={value}>{children}</RecurringContext.Provider>;
}

function RemoteRecurringProvider({ children }: { children: React.ReactNode }) {
  const value = useContextValue(useRemoteRecurringRules());
  return <RecurringContext.Provider value={value}>{children}</RecurringContext.Provider>;
}

/**
 * Single source of truth for recurring rules across routes, like the goals
 * provider. It must sit inside `TransactionsProvider`, since confirming an
 * occurrence writes a transaction.
 *
 * `remote` is decided on the server: once Google sign-in and the database
 * are configured, rules live in Neon (and sync across devices); otherwise
 * they stay in this browser's localStorage. Both expose the same API.
 */
export function RecurringProvider({
  remote = false,
  children,
}: {
  remote?: boolean;
  children: React.ReactNode;
}) {
  return remote ? (
    <RemoteRecurringProvider>{children}</RemoteRecurringProvider>
  ) : (
    <LocalRecurringProvider>{children}</LocalRecurringProvider>
  );
}

export function useRecurring() {
  const context = React.useContext(RecurringContext);
  if (!context) {
    throw new Error("useRecurring must be used within a RecurringProvider");
  }
  return context;
}
