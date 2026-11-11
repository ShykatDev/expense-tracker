"use client";

import * as React from "react";

/** How many sparkles fly out of the burst. */
const COUNT = 22;
/** Long enough for the slowest sparkle to finish its fade. */
const LIFETIME_MS = 1600;

/**
 * Deterministic pseudo-random in [0, 1) for particle `i`, so render stays
 * pure (no Math.random) and every burst has the same lively spread.
 */
function noise(i: number, salt: number) {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const PARTICLES = Array.from({ length: COUNT }, (_, i) => {
  const angle = (i / COUNT) * Math.PI * 2 + noise(i, 1) * 0.5;
  const distance = 90 + noise(i, 2) * 150;
  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance - 40,
    size: 10 + noise(i, 3) * 16,
    delay: noise(i, 4) * 180,
    duration: 900 + noise(i, 5) * 500,
    rotate: (noise(i, 6) - 0.5) * 180,
    // White and the hero's blue only — one accent, as everywhere else.
    color: i % 3 === 0 ? "#a9c4ff" : i % 3 === 1 ? "#ffffff" : "#d6e4ff",
  };
});

/**
 * A short sparkle burst from the centre of the screen, for completing a
 * goal: a rare moment, so it earns a little delight. Pass a new `burst`
 * number to play it; it removes itself when done. Skipped entirely for
 * people who prefer reduced motion.
 */
export function SparkleBurst({ burst }: { burst: number }) {
  const [active, setActive] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!burst) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const start = requestAnimationFrame(() => setActive(burst));
    const end = window.setTimeout(() => setActive(null), LIFETIME_MS);
    return () => {
      cancelAnimationFrame(start);
      window.clearTimeout(end);
    };
  }, [burst]);

  if (active === null) return null;

  return (
    <div
      key={active}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center"
    >
      {/* A soft flash at the centre. */}
      <span className="sparkle-flash absolute size-40 rounded-full bg-[radial-gradient(circle,rgba(169,196,255,0.45)_0%,rgba(169,196,255,0)_70%)]" />
      {PARTICLES.map((p, i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          className="sparkle absolute"
          style={
            {
              width: p.size,
              height: p.size,
              color: p.color,
              "--sx": `${p.x}px`,
              "--sy": `${p.y}px`,
              "--sr": `${p.rotate}deg`,
              animationDelay: `${p.delay}ms`,
              animationDuration: `${p.duration}ms`,
            } as React.CSSProperties
          }
        >
          {/* A four-point sparkle. */}
          <path
            fill="currentColor"
            d="M12 0c.6 5.6 2.4 8.9 6 10.2L24 12l-6 1.8c-3.6 1.3-5.4 4.6-6 10.2-.6-5.6-2.4-8.9-6-10.2L0 12l6-1.8C9.6 8.9 11.4 5.6 12 0Z"
          />
        </svg>
      ))}
    </div>
  );
}
