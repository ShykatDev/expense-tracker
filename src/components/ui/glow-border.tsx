import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * A slow light that travels around the edge of its parent, in the hero's
 * blue. Place it inside a `relative` element; by default it takes the
 * parent's corner radius.
 *
 * A conic gradient is spun with a plain transform (compositor-only, no
 * repaint per frame) and a mask trims it to a 1px ring. Keep it a sibling of
 * any element using backdrop-filter, never its parent, or the blur stops
 * reaching the page. With reduced motion it is a still, faint ring.
 */
export function GlowBorder({
  className,
  radius = "rounded-[inherit]",
  duration = 7,
  strength = 1,
}: {
  className?: string;
  /** Corner radius class; defaults to inheriting the parent's. */
  radius?: string;
  /** Seconds per lap. */
  duration?: number;
  /** 0–1, scales the light's brightness. */
  strength?: number;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden p-px",
        radius,
        className,
      )}
      style={{
        WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
        WebkitMaskComposite: "xor",
        mask: "linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)",
      }}
    >
      <span
        className="glow-sweep absolute top-1/2 left-1/2 aspect-square w-[160%]"
        style={{
          opacity: strength,
          animationDuration: `${duration}s`,
          background:
            "conic-gradient(from 0deg, rgba(75,122,214,0) 0deg, rgba(75,122,214,0) 200deg, rgba(75,122,214,0.55) 280deg, rgba(185,208,255,0.95) 320deg, rgba(75,122,214,0) 360deg)",
        }}
      />
    </span>
  );
}
