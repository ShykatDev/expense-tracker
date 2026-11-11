"use client";

import * as React from "react";

const defaultFormat = (value: number) => Math.round(value).toLocaleString("en-US");

/**
 * A number that counts to its value: up from zero on first show, then from
 * the old value to the new one whenever it changes (a month switch, a new
 * entry). It eases out quickly so the final digits settle gently.
 *
 * On a cold start it waits for the splash screen to leave (the
 * `app-loading` class on <html>), so the count isn't spent behind it.
 * Screen readers get the final value straight away; the moving digits are
 * hidden from them. With reduced motion it jumps straight to the value.
 */
export function AnimatedNumber({
  value,
  format = defaultFormat,
  duration = 900,
}: {
  value: number;
  format?: (value: number) => string;
  duration?: number;
}) {
  const [display, setDisplay] = React.useState(0);
  const currentRef = React.useRef(0);

  React.useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const length = reduceMotion ? 0 : duration;
    const root = document.documentElement;
    let frame = 0;
    let observer: MutationObserver | null = null;

    const run = () => {
      const from = currentRef.current;
      const startedAt = performance.now();
      const tick = (now: number) => {
        const progress = length === 0 ? 1 : Math.min((now - startedAt) / length, 1);
        // easeOutQuart: fast at first, settling softly.
        const eased = 1 - Math.pow(1 - progress, 4);
        const next = from + (value - from) * eased;
        currentRef.current = next;
        setDisplay(next);
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };

    if (root.classList.contains("app-loading")) {
      observer = new MutationObserver(() => {
        if (root.classList.contains("app-loading")) return;
        observer?.disconnect();
        run();
      });
      observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    } else {
      run();
    }

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [value, duration]);

  return (
    <>
      <span className="sr-only">{format(value)}</span>
      <span aria-hidden="true">{format(display)}</span>
    </>
  );
}
