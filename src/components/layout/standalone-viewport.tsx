"use client";

import * as React from "react";

/** Bigger gaps than this are the keyboard, not the status bar. */
const MAX_GAP = 80;

/**
 * Works around iOS's short viewport in the installed app.
 *
 * With the black-translucent status bar, iOS can report a viewport (100dvh,
 * innerHeight, the box fixed elements sit in) that is short by the status
 * bar's height, so the app ends above the bottom of the screen and the
 * bottom navigation floats too high. This measures the shortfall against the
 * physical screen and publishes it as `--viewport-gap`, which the frame adds
 * to its height and the navigation takes off its offset. Anywhere the
 * viewport is right, the gap is 0 and nothing changes.
 */
export function StandaloneViewport() {
  React.useEffect(() => {
    const standalone =
      (navigator as Navigator & { standalone?: boolean }).standalone === true ||
      window.matchMedia("(display-mode: standalone), (display-mode: fullscreen)").matches;
    if (!standalone) return;

    const root = document.documentElement;
    const update = () => {
      const portrait = window.innerHeight >= window.innerWidth;
      const screenHeight = portrait
        ? Math.max(screen.width, screen.height)
        : Math.min(screen.width, screen.height);
      const gap = Math.round(screenHeight - window.innerHeight);
      // Keep the last value while the keyboard is up.
      if (gap > MAX_GAP) return;
      root.style.setProperty("--viewport-gap", `${Math.max(gap, 0)}px`);
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return null;
}
