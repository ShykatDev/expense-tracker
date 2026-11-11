"use client"

import * as React from "react"

/**
 * Reads a JSON value out of localStorage and keeps it in sync across tabs.
 *
 * `useSyncExternalStore` avoids the setState-in-effect pattern the other
 * storage hooks use, and gives cross-tab sync for free. The server snapshot
 * is always the empty value, so the first client render matches the server
 * and React hydrates without a mismatch.
 */
export function useLocalStorageJson<T>(
  key: string,
  parse: (raw: string) => T,
  fallback: T,
): [T, (next: T | ((prev: T) => T)) => void] {
  // The snapshot has to be referentially stable between renders, otherwise
  // React re-reads on every render and never settles.
  const cache = React.useRef<{ raw: string | null; value: T }>({
    raw: null,
    value: fallback,
  })

  const subscribe = React.useCallback(
    (onStoreChange: () => void) => {
      window.addEventListener("storage", onStoreChange)
      return () => window.removeEventListener("storage", onStoreChange)
    },
    [],
  )

  const getSnapshot = React.useCallback(() => {
    const raw = window.localStorage.getItem(key)
    if (raw === cache.current.raw) return cache.current.value

    let value = fallback
    try {
      value = raw ? parse(raw) : fallback
    } catch {
      value = fallback
    }

    cache.current = { raw, value }
    return value
  }, [key, parse, fallback])

  const getServerSnapshot = React.useCallback(() => fallback, [fallback])

  const value = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  )

  const setValue = React.useCallback(
    (next: T | ((prev: T) => T)) => {
      const resolved =
        typeof next === "function"
          ? (next as (prev: T) => T)(getSnapshot())
          : next
      window.localStorage.setItem(key, JSON.stringify(resolved))
      // `storage` only fires in other tabs, so notify this one by hand.
      window.dispatchEvent(new Event("storage"))
    },
    [key, getSnapshot],
  )

  return [value, setValue]
}
