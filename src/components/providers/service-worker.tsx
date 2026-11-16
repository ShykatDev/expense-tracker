"use client";

import * as React from "react";

/**
 * Registers /sw.js so the installed app opens offline. Production only: in
 * development a cached page would hide code changes.
 */
export function ServiceWorkerRegistration() {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Not fatal: the app works online without it.
    });
  }, []);
  return null;
}
