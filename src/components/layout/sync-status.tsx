"use client";

import { CloudOff, RefreshCw } from "lucide-react";
import * as React from "react";

import { usePendingCount } from "@/lib/offline/sync";
import { cn } from "@/lib/utils";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/**
 * A small pill beside the logo: a cloud-off icon while offline, a spinning
 * one while syncing, with how many changes are waiting to reach the server.
 * Hidden when everything is synced, so it only shows up when it matters.
 */
export function SyncStatus({ className }: { className?: string }) {
  const online = React.useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  const pending = usePendingCount();
  if (online && pending === 0) return null;

  const label = !online
    ? pending > 0
      ? `Offline. ${pending} ${pending === 1 ? "change" : "changes"} waiting to sync.`
      : "Offline. Changes will sync when you're back online."
    : `Syncing ${pending} ${pending === 1 ? "change" : "changes"}…`;

  // Compact (icon + count) so it fits beside the logo on a phone; the full
  // wording is in the accessible label and the tooltip.
  return (
    <span
      role="status"
      aria-label={label}
      title={label}
      className={cn(
        "flex h-7 shrink-0 items-center gap-1 rounded-full bg-white/10 px-2 text-[11px] whitespace-nowrap text-white/80 tabular-nums ring-1 ring-white/15",
        className,
      )}
    >
      {online ? (
        <RefreshCw className="size-3.5 animate-spin [animation-duration:2s]" />
      ) : (
        <CloudOff className="size-3.5" />
      )}
      {pending > 0 && <span>{pending}</span>}
    </span>
  );
}
