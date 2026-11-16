"use client";

import * as React from "react";

/**
 * The offline outbox: every change a signed-in user makes is queued here and
 * sent to the server in order.
 *
 * - The queue is saved in localStorage, so changes made with no signal
 *   survive the app being closed and are sent the next time it opens.
 * - A send that fails because the network is down waits and is retried
 *   (when the connection comes back, when the app returns to the
 *   foreground, and every 30 seconds). Nothing is rolled back for that.
 * - A send the server rejects is dropped: the caller rolls its optimistic
 *   change back and the server's data is reloaded.
 * - One queue for every data area, sent strictly in order, so related
 *   changes (an expense, then the goal it completes) arrive as they were
 *   made.
 */

interface Entry {
  id: string;
  /** Registered action name, e.g. "transactions.add". */
  name: string;
  args: unknown[];
  /** The query to refresh once the queue has drained (e.g. "transactions"). */
  queryKey: string;
  createdAt: number;
}

type Action = (...args: unknown[]) => Promise<unknown>;

const STORAGE_KEY = "expense-tracker:outbox";
const RETRY_MS = 30_000;

const actions = new Map<string, Action>();
const waiters = new Map<string, { resolve: () => void; reject: (error: unknown) => void }>();
const listeners = new Set<() => void>();

let queue: Entry[] | null = null;
let flushing: Promise<void> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
/** Query keys touched since the queue was last empty. */
let touched = new Set<string>();

let onDrained: (queryKeys: string[]) => void = () => {};
let onRejected: (queryKey: string) => void = () => {};

/* ------------------------------------------------------------------ */
/* Persistence (keeps explicit `undefined`, e.g. a cleared note)       */
/* ------------------------------------------------------------------ */

const UNDEFINED = "__outbox_undefined__";

function encode(value: unknown): unknown {
  if (value === undefined) return UNDEFINED;
  if (Array.isArray(value)) return value.map(encode);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, encode(v)]));
  }
  return value;
}

function decode(value: unknown): unknown {
  if (value === UNDEFINED) return undefined;
  if (Array.isArray(value)) return value.map(decode);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = decode(v);
    return out;
  }
  return value;
}

function load(): Entry[] {
  if (queue) return queue;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    queue = Array.isArray(parsed)
      ? parsed.map((entry: Entry) => ({ ...entry, args: decode(entry.args) as unknown[] }))
      : [];
  } catch {
    queue = [];
  }
  return queue;
}

function save() {
  try {
    const list = load();
    if (list.length === 0) window.localStorage.removeItem(STORAGE_KEY);
    else {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(list.map((entry) => ({ ...entry, args: encode(entry.args) }))),
      );
    }
  } catch {
    // Storage full or blocked: the in-memory queue still works this session.
  }
  for (const listener of listeners) listener();
}

/* ------------------------------------------------------------------ */
/* Errors                                                              */
/* ------------------------------------------------------------------ */

/**
 * True when a failure means "couldn't reach the server" rather than "the
 * server said no". fetch rejects with a TypeError on network failure
 * ("Failed to fetch", Safari's "Load failed").
 */
export function isNetworkError(error: unknown) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  if (error instanceof TypeError) return true;
  const message = error instanceof Error ? error.message : String(error);
  return /failed to fetch|load failed|network ?error|networkerror|fetch failed/i.test(message);
}

/** Thrown by `afterSync` while unsent changes are still waiting. */
export class PendingSyncError extends Error {
  constructor() {
    super("Changes are waiting to sync");
  }
}

/** Errors a data hook shouldn't toast about: offline, or still syncing. */
export function isOfflineError(error: unknown) {
  return error instanceof PendingSyncError || isNetworkError(error);
}

/* ------------------------------------------------------------------ */
/* Queue                                                               */
/* ------------------------------------------------------------------ */

export function registerAction(name: string, action: Action) {
  actions.set(name, action);
}

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Queues a server action call. The promise resolves once the server has it,
 * rejects if the server refuses it, and simply stays pending while offline.
 */
export function enqueue(name: string, queryKey: string, args: unknown[]) {
  const entry: Entry = { id: newId(), name, args, queryKey, createdAt: Date.now() };
  load().push(entry);
  save();
  const promise = new Promise<void>((resolve, reject) => {
    waiters.set(entry.id, { resolve, reject });
  });
  void flush();
  return promise;
}

function scheduleRetry() {
  if (retryTimer) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void flush();
  }, RETRY_MS);
}

/** Sends queued changes in order until the queue is empty or the network fails. */
export function flush(): Promise<void> {
  if (flushing) return flushing;
  flushing = (async () => {
    let sent = 0;
    for (;;) {
      const list = load();
      const entry = list[0];
      if (!entry) break;
      const action = actions.get(entry.name);
      if (!action) {
        // Unknown action (e.g. from an older app version): drop it.
        list.shift();
        save();
        continue;
      }
      try {
        await action(...entry.args);
        list.shift();
        save();
        touched.add(entry.queryKey);
        sent += 1;
        waiters.get(entry.id)?.resolve();
        waiters.delete(entry.id);
      } catch (error) {
        if (isNetworkError(error)) {
          scheduleRetry();
          break;
        }
        // The server refused it: drop it and let the caller roll back.
        list.shift();
        save();
        touched.add(entry.queryKey);
        const waiter = waiters.get(entry.id);
        waiters.delete(entry.id);
        if (waiter) waiter.reject(error);
        else onRejected(entry.queryKey);
      }
    }
    if (load().length === 0 && (sent > 0 || touched.size > 0)) {
      const keys = [...touched];
      touched = new Set();
      onDrained(keys);
    }
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

/**
 * Wraps a data fetch so it never overwrites unsent changes: the queue is
 * sent first, and while anything is still waiting (offline) the fetch is
 * skipped and the cached data stays on screen.
 */
export async function afterSync<T>(fetcher: () => Promise<T>): Promise<T> {
  await flush();
  if (load().length > 0) throw new PendingSyncError();
  return fetcher();
}

export function pendingCount() {
  return queue ? queue.length : 0;
}

/** Number of changes waiting to sync, live. */
export function usePendingCount() {
  return React.useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => load().length,
    () => 0,
  );
}

/** Forgets every unsent change (on sign-out, after warning the user). */
export function clearOutbox() {
  queue = [];
  touched = new Set();
  for (const waiter of waiters.values()) waiter.reject(new Error("Signed out"));
  waiters.clear();
  save();
}

let started = false;

/**
 * Hooks the queue up to the app: what to refresh once it drains, what to do
 * when the server refuses a change from an earlier session, and when to
 * retry. Safe to call more than once.
 */
export function startSync(options: {
  onDrained: (queryKeys: string[]) => void;
  onRejected: (queryKey: string) => void;
}) {
  onDrained = options.onDrained;
  onRejected = options.onRejected;
  if (started || typeof window === "undefined") return;
  started = true;
  const retry = () => void flush();
  window.addEventListener("online", retry);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") retry();
  });
  // Anything left from an earlier session goes out now.
  retry();
}
