"use client";

import * as React from "react";

import { AppLogo } from "@/components/brand/app-logo";
import { useTransactions } from "@/components/dashboard/transactions-provider";
import { cn } from "@/lib/utils";

/** Long enough to register as a deliberate launch moment, short enough not to annoy. */
const MIN_VISIBLE_MS = 1100;
const FADE_MS = 450;

/**
 * The launch screen: the Pulse mark with its bars pulsing, the name and a
 * tagline, on the hero's navy gradient.
 *
 * It is server-rendered as part of the page, so it covers the very first
 * paint instead of flashing an empty dashboard. It leaves once the stored
 * data has loaded and a minimum time has passed, then fades out and
 * unmounts. The root layout persists across navigation, so it only appears
 * on a cold start or a full reload.
 */
export function SplashScreen() {
  const { isLoaded } = useTransactions();
  const [minElapsed, setMinElapsed] = React.useState(false);
  const [gone, setGone] = React.useState(false);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setMinElapsed(true), MIN_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const leaving = isLoaded && minElapsed;

  // As the splash starts to fade, release the page so it sharpens out of its
  // blur underneath (see .reveal-target in globals.css).
  React.useEffect(() => {
    if (leaving) document.documentElement.classList.remove("app-loading");
  }, [leaving]);

  React.useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(() => setGone(true), FADE_MS);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  if (gone) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading Pulse"
      className={cn(
        // touch-none stops a swipe on the splash from scrolling the page behind it.
        "fixed inset-0 z-[100] flex touch-none flex-col items-center justify-center overscroll-none transition-opacity ease-out",
        leaving ? "pointer-events-none opacity-0" : "opacity-100",
      )}
      style={{
        transitionDuration: `${FADE_MS}ms`,
        background:
          "radial-gradient(70% 45% at 50% 38%, rgba(59,130,246,0.22) 0%, rgba(59,130,246,0) 70%), linear-gradient(180deg, #0a1f52 0%, #06122f 50%, #020409 100%)",
      }}
    >
      <div
        className={cn(
          "flex flex-col items-center transition-transform ease-out",
          leaving ? "scale-95" : "scale-100",
        )}
        style={{ transitionDuration: `${FADE_MS}ms` }}
      >
        <AppLogo
          animated
          className="size-24 rounded-[1.6rem] shadow-[0_20px_60px_-15px_rgba(59,130,246,0.55)] animate-in fade-in zoom-in-90 duration-700"
        />
        <p className="mt-6 font-display text-3xl font-bold tracking-tight text-white animate-in fade-in slide-in-from-bottom-2 duration-700 fill-mode-both [animation-delay:150ms]">
          Pulse
        </p>
        <p className="mt-1.5 text-sm text-white/55 animate-in fade-in slide-in-from-bottom-2 duration-700 fill-mode-both [animation-delay:300ms]">
          Your money, at a glance
        </p>
      </div>

      <div className="absolute bottom-[max(3rem,calc(env(safe-area-inset-bottom)+2rem))] h-1 w-16 overflow-hidden rounded-full bg-white/10">
        <span className="splash-progress block h-full w-1/3 rounded-full bg-white/60" />
      </div>
    </div>
  );
}
