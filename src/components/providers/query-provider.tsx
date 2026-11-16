"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "@yusufceng1z/ding-react";

import { startSync } from "@/lib/offline/sync";

/** The synced data areas, by query key. */
const PERSISTED_KEYS = ["transactions", "accounts", "categories", "targets", "goals", "recurring"];

/** Last-loaded data, kept so the app opens with your data even offline. */
export const QUERY_CACHE_STORAGE_KEY = "expense-tracker:query-cache";

type Snapshot = Record<string, { data: unknown; updatedAt: number }>;

function readSnapshot(): Snapshot {
  try {
    const raw = window.localStorage.getItem(QUERY_CACHE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Snapshot) : {};
  } catch {
    return {};
  }
}

/**
 * Set once the cache is cleared (sign-out, account deletion), so the save
 * that runs as the page unloads can't write the old data straight back.
 */
let persistenceStopped = false;

function writeSnapshot(client: QueryClient) {
  if (persistenceStopped) return;
  const snapshot: Snapshot = {};
  for (const key of PERSISTED_KEYS) {
    const state = client.getQueryState([key]);
    if (state?.data !== undefined) snapshot[key] = { data: state.data, updatedAt: state.dataUpdatedAt };
  }
  try {
    // Nothing loaded (e.g. on the sign-in page): leave no empty entry behind.
    if (Object.keys(snapshot).length === 0) window.localStorage.removeItem(QUERY_CACHE_STORAGE_KEY);
    else window.localStorage.setItem(QUERY_CACHE_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Storage full or blocked: the app just loads from the server next time.
  }
}

/** Forgets the cached data (on sign-out, so the next account starts clean). */
export function clearQueryCache() {
  persistenceStopped = true;
  try {
    window.localStorage.removeItem(QUERY_CACHE_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * One query cache for the app.
 *
 * - Data refetches when the app comes back to the foreground, which is how
 *   entries made on another device show up.
 * - The synced areas are kept in localStorage, so the app shows your data
 *   immediately on open — including with no signal — while it refreshes.
 * - It starts the offline outbox: once queued changes have all reached the
 *   server, the affected data is reloaded; a change the server refused in an
 *   earlier session is reported and reloaded too.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: true,
            retry: 1,
          },
        },
      }),
  );

  React.useEffect(() => {
    // Restored after mount (not during render) so the server-rendered HTML
    // and the first client render match.
    const snapshot = readSnapshot();
    for (const [key, entry] of Object.entries(snapshot)) {
      if (!PERSISTED_KEYS.includes(key)) continue;
      // Don't replace data a request already brought in this session.
      if (client.getQueryState([key])?.data !== undefined) continue;
      client.setQueryData([key], entry.data, { updatedAt: entry.updatedAt });
    }

    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = client.getQueryCache().subscribe((event) => {
      const key = event.query.queryKey[0];
      if (event.type !== "updated" || typeof key !== "string" || !PERSISTED_KEYS.includes(key)) {
        return;
      }
      if (timer) clearTimeout(timer);
      timer = setTimeout(save, 150);
    });
    // Offline, moving between pages is a full page load: save before the
    // page goes away, or a change made just before it would be missing.
    function save() {
      if (timer) clearTimeout(timer);
      timer = null;
      writeSnapshot(client);
    }
    window.addEventListener("pagehide", save);

    startSync({
      onDrained: (keys) => {
        for (const key of keys) void client.invalidateQueries({ queryKey: [key] });
      },
      onRejected: (key) => {
        toast.error("A change made earlier couldn’t be saved, so it was undone.");
        void client.invalidateQueries({ queryKey: [key] });
      },
    });

    return () => {
      unsubscribe();
      window.removeEventListener("pagehide", save);
      if (timer) clearTimeout(timer);
    };
  }, [client]);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
