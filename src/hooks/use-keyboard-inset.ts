"use client";

import * as React from "react";

/**
 * How many pixels of the layout viewport the on-screen keyboard covers.
 *
 * On iPhone (and Android Chrome) the keyboard shrinks only the *visual*
 * viewport; anything pinned to the bottom of the page stays behind the
 * keyboard. Lifting such an element by this inset keeps it just above the
 * keyboard. 0 when no keyboard is open, or where visualViewport is missing.
 */
export function useKeyboardInset() {
  return React.useSyncExternalStore(subscribe, getInset, () => 0);
}

function subscribe(onChange: () => void) {
  const viewport = window.visualViewport;
  if (!viewport) return () => {};
  viewport.addEventListener("resize", onChange);
  viewport.addEventListener("scroll", onChange);
  return () => {
    viewport.removeEventListener("resize", onChange);
    viewport.removeEventListener("scroll", onChange);
  };
}

function getInset() {
  const viewport = window.visualViewport;
  if (!viewport) return 0;
  const covered = window.innerHeight - viewport.height - viewport.offsetTop;
  // Ignore sub-pixel noise and the few pixels browser bars can account for.
  return covered > 40 ? Math.round(covered) : 0;
}
