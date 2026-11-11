"use client";

import { ReactLenis, useLenis } from "lenis/react";
import { usePathname } from "next/navigation";
import * as React from "react";

/**
 * Lenis smooth scrolling for the whole page, on touch as well as wheel.
 *
 * - `syncTouch` gives finger scrolling Lenis's eased glide on phones; the
 *   lerp and inertia are tuned so it still feels direct, not floaty.
 * - `allowNestedScroll` lets inner scroll areas (lists in dialogs, the
 *   category picker) scroll natively. Areas that run their own gestures —
 *   the dashboard's swipe sheet, dialogs, popovers — are opted out with
 *   `data-lenis-prevent`.
 * - It is paused while the splash screen is up (matching the scroll lock)
 *   and jumps back to the top on every route change.
 * - Turned off entirely for people who prefer reduced motion.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = React.useState(false);

  // Decided after mount: matchMedia isn't available on the server.
  React.useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setEnabled(!query.matches);
    const frame = requestAnimationFrame(update);
    query.addEventListener("change", update);
    return () => {
      cancelAnimationFrame(frame);
      query.removeEventListener("change", update);
    };
  }, []);

  if (!enabled) return <>{children}</>;

  return (
    <ReactLenis
      root
      options={{
        autoRaf: true,
        lerp: 0.1,
        syncTouch: true,
        syncTouchLerp: 0.08,
        touchInertiaExponent: 1.6,
        allowNestedScroll: true,
        anchors: true,
      }}
    >
      <LenisLifecycle />
      {children}
    </ReactLenis>
  );
}

/** Pauses Lenis behind the splash screen and resets it on navigation. */
function LenisLifecycle() {
  const lenis = useLenis();
  const pathname = usePathname();

  React.useEffect(() => {
    if (!lenis) return;
    const root = document.documentElement;
    if (!root.classList.contains("app-loading")) return;

    lenis.stop();
    const observer = new MutationObserver(() => {
      if (root.classList.contains("app-loading")) return;
      observer.disconnect();
      lenis.start();
    });
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [lenis]);

  React.useEffect(() => {
    lenis?.scrollTo(0, { immediate: true, force: true });
  }, [lenis, pathname]);

  return null;
}
