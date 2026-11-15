import type { TransactionType } from "@/lib/transactions";

/**
 * Recurring transactions: rent, salary, subscriptions, bills.
 *
 * A rule never writes to the ledger on its own. Each scheduled occurrence
 * shows up as "due" and waits for the user to confirm (optionally with a
 * different amount, since bills vary) or skip it, so nothing lands in the
 * history without the user knowing.
 *
 * Every occurrence belongs to exactly one period (a month, a year or a
 * week) and is identified by that period's key. Handling an occurrence
 * records its key, so the same occurrence can't be confirmed twice, and
 * moving the day of the month doesn't resurrect one already handled.
 */

export type RecurringFrequency = "monthly" | "weekly" | "yearly";

export interface RecurringRule {
  id: string;
  type: TransactionType;
  /** The category label, exactly as `Transaction.category` stores it. */
  category: string;
  amount: number;
  frequency: RecurringFrequency;
  /**
   * Monthly only: the day it falls on, 1–31. Short months clamp to their
   * last day, so "the 31st" is Feb 28/29, Apr 30, …
   */
  dayOfMonth: number;
  /**
   * Local midnight of the first day the rule may fall on. Weekly rules repeat
   * on this date's weekday, yearly rules on its month and day.
   */
  startDate: number;
  note?: string;
  paused: boolean;
  /**
   * Every occurrence up to and including this period is handled. Keeps
   * `handled` short: confirmed keys are folded into it once there's no gap.
   */
  settledThrough?: string;
  /** Handled period keys after `settledThrough` (an out-of-order confirm or skip). */
  handled: string[];
  createdAt: number;
  updatedAt: number;
}

/** One scheduled occurrence of a rule. */
export interface RecurringOccurrence {
  ruleId: string;
  /** Unique within the rule; see `periodKey`. */
  periodKey: string;
  /** Local midnight of the day it falls on. */
  dueDate: number;
  type: TransactionType;
  category: string;
  amount: number;
  note?: string;
}

export const RECURRING_STORAGE_KEY = "expense-tracker:recurring";

export const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  monthly: "Monthly",
  weekly: "Weekly",
  yearly: "Yearly",
};

/** Safety net: a rule backdated by decades shouldn't hang the page. */
const MAX_PERIODS = 2000;
/** How many overdue occurrences of one rule are listed at most. */
export const MAX_BACKLOG = 24;

const DAY_MS = 86_400_000;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

/** Local "YYYY-MM-DD". */
export function toDateKey(time: number) {
  const date = new Date(time);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Local midnight of the given moment's day. */
export function startOfDay(time: number) {
  const date = new Date(time);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export function clampDayOfMonth(day: number) {
  if (!Number.isFinite(day)) return 1;
  return Math.min(31, Math.max(1, Math.round(day)));
}

/** Monday 00:00 of the week containing `time`. */
function startOfWeek(time: number) {
  const date = new Date(startOfDay(time));
  const offset = (date.getDay() + 6) % 7;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - offset).getTime();
}

/**
 * The key of the period containing `time`: "2026-11" (monthly), "2026"
 * (yearly) or "W2026-11-09", that week's Monday (weekly). Keys of one
 * frequency sort chronologically as plain strings.
 */
export function periodKey(frequency: RecurringFrequency, time: number) {
  const date = new Date(time);
  if (frequency === "yearly") return String(date.getFullYear());
  if (frequency === "weekly") return `W${toDateKey(startOfWeek(time))}`;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

/**
 * Walks a rule's periods from the one holding its start date, yielding each
 * occurrence's day and key. The caller decides when to stop.
 */
function* walkOccurrences(rule: RecurringRule) {
  const start = startOfDay(rule.startDate);
  const first = new Date(start);

  for (let i = 0; i < MAX_PERIODS; i++) {
    let due: number;
    if (rule.frequency === "weekly") {
      // Same weekday as the start date, i weeks on.
      due = new Date(first.getFullYear(), first.getMonth(), first.getDate() + i * 7).getTime();
    } else if (rule.frequency === "yearly") {
      const year = first.getFullYear() + i;
      const month = first.getMonth();
      due = new Date(year, month, Math.min(first.getDate(), daysInMonth(year, month))).getTime();
    } else {
      const month = new Date(first.getFullYear(), first.getMonth() + i, 1);
      const y = month.getFullYear();
      const m = month.getMonth();
      due = new Date(y, m, Math.min(clampDayOfMonth(rule.dayOfMonth), daysInMonth(y, m))).getTime();
    }
    // A monthly rule starting on the 20th with a day of the 1st first falls
    // on the 1st of the next month.
    if (due < start) continue;
    yield { dueDate: due, periodKey: periodKey(rule.frequency, due) };
  }
}

/** Whether the occurrence in `key` has been confirmed or skipped. */
export function isHandled(rule: RecurringRule, key: string) {
  if (rule.settledThrough && key <= rule.settledThrough) return true;
  return rule.handled.includes(key);
}

function toOccurrence(rule: RecurringRule, dueDate: number, key: string): RecurringOccurrence {
  return {
    ruleId: rule.id,
    periodKey: key,
    dueDate,
    type: rule.type,
    category: rule.category,
    amount: rule.amount,
    note: rule.note,
  };
}

/**
 * The rule's unhandled occurrences falling on or before `until`, oldest
 * first. Past ones are included, so two months away from the app means two
 * rents waiting. Paused rules have none.
 */
export function pendingOccurrences(
  rule: RecurringRule,
  until: number,
  limit = MAX_BACKLOG,
): RecurringOccurrence[] {
  if (rule.paused) return [];
  const result: RecurringOccurrence[] = [];
  for (const occurrence of walkOccurrences(rule)) {
    if (occurrence.dueDate > until) break;
    if (isHandled(rule, occurrence.periodKey)) continue;
    result.push(toOccurrence(rule, occurrence.dueDate, occurrence.periodKey));
    if (result.length >= limit) break;
  }
  return result;
}

/** End of the day containing `now`: everything dated today counts as due. */
export function endOfDay(now: number) {
  return startOfDay(now) + DAY_MS - 1;
}

/** Occurrences across all rules that are due today or overdue, oldest first. */
export function dueOccurrences(rules: RecurringRule[], now: number) {
  const until = endOfDay(now);
  return rules
    .flatMap((rule) => pendingOccurrences(rule, until))
    .sort((a, b) => a.dueDate - b.dueDate || a.category.localeCompare(b.category));
}

/**
 * The next occurrence still waiting on the user: the oldest overdue one if
 * any, otherwise the next upcoming. Null for a paused rule.
 */
export function nextOccurrence(rule: RecurringRule): RecurringOccurrence | null {
  if (rule.paused) return null;
  for (const occurrence of walkOccurrences(rule)) {
    if (!isHandled(rule, occurrence.periodKey)) {
      return toOccurrence(rule, occurrence.dueDate, occurrence.periodKey);
    }
  }
  return null;
}

/**
 * Records an occurrence as handled (confirmed or skipped) and folds the
 * handled keys into `settledThrough` while they form an unbroken run, so the
 * list doesn't grow forever.
 */
export function markHandled(rule: RecurringRule, key: string): RecurringRule {
  if (isHandled(rule, key)) return rule;
  const handled = new Set([...rule.handled, key]);

  let settledThrough = rule.settledThrough;
  for (const occurrence of walkOccurrences(rule)) {
    if (settledThrough && occurrence.periodKey <= settledThrough) continue;
    if (!handled.has(occurrence.periodKey)) break;
    handled.delete(occurrence.periodKey);
    settledThrough = occurrence.periodKey;
  }

  return { ...rule, settledThrough, handled: [...handled].sort() };
}

/**
 * Settles every occurrence dated before today. Used when a rule is resumed
 * (a pause means "don't ask me about these") and when its frequency changes
 * (the old period keys no longer line up with the new schedule).
 */
export function settleBefore(rule: RecurringRule, now: number): RecurringRule {
  const today = startOfDay(now);
  let settledThrough: string | undefined;
  for (const occurrence of walkOccurrences(rule)) {
    if (occurrence.dueDate >= today) break;
    settledThrough = occurrence.periodKey;
  }
  const keep = rule.handled.filter((key) => !settledThrough || key > settledThrough);
  // Only ever move the cursor forward.
  if (rule.settledThrough && (!settledThrough || rule.settledThrough > settledThrough)) {
    settledThrough = rule.settledThrough;
  }
  return { ...rule, settledThrough, handled: keep };
}

/**
 * The transaction timestamp for a confirmed occurrence: its due day at the
 * current time of day, so it sorts naturally among that day's entries.
 * Today's (or a future) occurrence simply uses now.
 */
export function occurrenceTimestamp(dueDate: number, now: number) {
  if (dueDate >= startOfDay(now)) return now;
  const at = new Date(now);
  const due = new Date(dueDate);
  due.setHours(at.getHours(), at.getMinutes(), at.getSeconds(), at.getMilliseconds());
  return due.getTime();
}

/** 1 → "1st", 22 → "22nd", 13 → "13th". */
export function ordinal(day: number) {
  const mod100 = day % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

/** "Monthly on the 1st", "Weekly on Monday", "Yearly on Nov 15". */
export function describeSchedule(
  rule: Pick<RecurringRule, "frequency" | "dayOfMonth" | "startDate">,
) {
  const start = new Date(rule.startDate);
  if (rule.frequency === "weekly") {
    return `Weekly on ${start.toLocaleDateString("en-US", { weekday: "long" })}`;
  }
  if (rule.frequency === "yearly") {
    return `Yearly on ${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  }
  return `Monthly on the ${ordinal(clampDayOfMonth(rule.dayOfMonth))}`;
}

/** "Nov 1", with the year only when it isn't this year's. */
export function formatDueDate(dueDate: number, now: number) {
  const date = new Date(dueDate);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== new Date(now).getFullYear() && { year: "numeric" }),
  });
}

/** Whole days from today to the due day: 0 today, negative when overdue. */
export function daysFromToday(dueDate: number, now: number) {
  return Math.round((startOfDay(dueDate) - startOfDay(now)) / DAY_MS);
}

/** "due today", "due tomorrow", "due Nov 1", "overdue · Nov 1". */
export function describeDue(dueDate: number, now: number) {
  const days = daysFromToday(dueDate, now);
  if (days === 0) return "due today";
  if (days === 1) return "due tomorrow";
  if (days < 0) return `overdue · ${formatDueDate(dueDate, now)}`;
  return `due ${formatDueDate(dueDate, now)}`;
}

/** Drops malformed entries from storage instead of failing the page. */
export function sanitizeRules(parsed: unknown): RecurringRule[] {
  if (!Array.isArray(parsed)) return [];

  const rules: RecurringRule[] = [];
  for (const entry of parsed) {
    if (!entry || typeof entry !== "object") continue;
    const value = entry as Partial<RecurringRule>;
    if (typeof value.id !== "string" || !value.id) continue;
    if (value.type !== "income" && value.type !== "expense") continue;
    if (typeof value.category !== "string" || !value.category.trim()) continue;
    if (
      typeof value.amount !== "number" ||
      !Number.isFinite(value.amount) ||
      value.amount <= 0
    ) {
      continue;
    }
    if (typeof value.startDate !== "number" || !Number.isFinite(value.startDate)) continue;

    const frequency: RecurringFrequency =
      value.frequency === "weekly" || value.frequency === "yearly"
        ? value.frequency
        : "monthly";

    rules.push({
      id: value.id,
      type: value.type,
      category: value.category.trim(),
      amount: value.amount,
      frequency,
      dayOfMonth: clampDayOfMonth(
        typeof value.dayOfMonth === "number" ? value.dayOfMonth : new Date(value.startDate).getDate(),
      ),
      startDate: startOfDay(value.startDate),
      note: typeof value.note === "string" && value.note.trim() ? value.note.trim() : undefined,
      paused: value.paused === true,
      settledThrough:
        typeof value.settledThrough === "string" ? value.settledThrough : undefined,
      handled: Array.isArray(value.handled)
        ? value.handled.filter((key): key is string => typeof key === "string")
        : [],
      createdAt: typeof value.createdAt === "number" ? value.createdAt : Date.now(),
      updatedAt: typeof value.updatedAt === "number" ? value.updatedAt : Date.now(),
    });
  }
  return rules;
}

/* ------------------------------------------------------------------ */
/* Rule edits, shared by the browser-storage hook and the Neon one so  */
/* both produce identical rules. They run on the client because period */
/* keys and "today" depend on the user's local time zone; the server   */
/* only validates the result (see src/server/recurring.ts).            */
/* ------------------------------------------------------------------ */

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

function normalizeRuleInput(input: RecurringRuleInput) {
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

/** A new, active rule with a client-made id, so callers can use it at once. */
export function createRule(input: RecurringRuleInput, id: string, now = Date.now()): RecurringRule {
  return {
    id,
    ...normalizeRuleInput(input),
    paused: false,
    handled: [],
    createdAt: now,
    updatedAt: now,
  };
}

/** The rule after the dialog's edits are applied. */
export function applyRuleInput(
  rule: RecurringRule,
  input: RecurringRuleInput,
  now = Date.now(),
): RecurringRule {
  const next: RecurringRule = { ...rule, ...normalizeRuleInput(input), updatedAt: now };
  // Period keys differ between frequencies, so the old handled record is
  // meaningless; don't resurface the past either.
  if (next.frequency !== rule.frequency) {
    return settleBefore({ ...next, settledThrough: undefined, handled: [] }, now);
  }
  return next;
}

/**
 * Pausing hides the rule's occurrences. Resuming settles everything dated
 * before today, so a long pause doesn't come back as a pile of overdue bills.
 */
export function applyPaused(rule: RecurringRule, paused: boolean, now = Date.now()): RecurringRule {
  if (rule.paused === paused) return rule;
  const next = { ...rule, paused, updatedAt: now };
  return paused ? next : settleBefore(next, now);
}

/** "2026", "2026-11" or "W2026-11-09": the shapes `periodKey` produces. */
export function isPeriodKey(value: unknown): value is string {
  return typeof value === "string" && /^(\d{4}|\d{4}-\d{2}|W\d{4}-\d{2}-\d{2})$/.test(value);
}
