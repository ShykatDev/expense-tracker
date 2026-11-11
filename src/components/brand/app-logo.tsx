import * as React from "react";

import { cn } from "@/lib/utils";

/** The mark's line: a dip and a climb to a high point, like the spending chart. */
export const PULSE_PATH = "M11 40 C17 40 19 30 25 30 C31 30 32 42 38 42 C44 42 45 23 50 22";

/**
 * The Pulse app icon as inline SVG — the same drawing as `app/icon.svg`: a
 * smooth line rising to a ringed point (the dashboard chart's own shape) on
 * the hero's navy tile.
 *
 * With `animated`, the line draws itself on a loop and the point gently
 * pulses (see `.pulse-line` / `.pulse-dot` in globals.css) — the launch
 * screen shows this while data loads.
 */
export function AppLogo({
  className,
  animated = false,
}: {
  className?: string;
  animated?: boolean;
}) {
  // Gradient ids must be unique per instance, or two logos on one page would
  // fight over the same <defs>.
  const id = React.useId().replace(/:/g, "");

  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className={cn("shrink-0", className)}>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#14398a" />
          <stop offset="0.55" stopColor="#0a1f4f" />
          <stop offset="1" stopColor="#040915" />
        </linearGradient>
        <radialGradient
          id={`${id}-glow`}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(50 18) rotate(90) scale(30)"
        >
          <stop offset="0" stopColor="#3b82f6" stopOpacity="0.55" />
          <stop offset="1" stopColor="#3b82f6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-line`} x1="10" y1="0" x2="52" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#b9d0ff" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill={`url(#${id}-bg)`} />
      <rect width="64" height="64" rx="15" fill={`url(#${id}-glow)`} />
      <path
        d={PULSE_PATH}
        pathLength={100}
        stroke={`url(#${id}-line)`}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={animated ? "pulse-line" : undefined}
      />
      <circle
        cx="50"
        cy="22"
        r="5.5"
        fill="#0a1f4f"
        stroke="#d6e4ff"
        strokeWidth="3"
        className={animated ? "pulse-dot" : undefined}
      />
    </svg>
  );
}

/**
 * The minimal Pulse mark for the page header: just the line and its ringed
 * point, in the current text colour, with no tile.
 */
export function AppMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="8 16 47 30"
      fill="none"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <path
        d={PULSE_PATH}
        stroke="currentColor"
        strokeOpacity="0.75"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="50" cy="22" r="4.75" fill="#0a1f4f" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}
