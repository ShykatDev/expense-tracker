"use client";

import { ChevronUp } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The least room the collapsed sheet keeps for its preview: the chart's
 * header, plot and labels plus the floating bottom nav. The swipe hint can
 * tuck behind the nav on short screens.
 */
const MIN_PEEK = 340;
/** Space between the hero's header row and the top of the open sheet. */
const HEADER_GAP = 16;
/** How far the sheet tucks up under the bottom of the hero when collapsed. */
const HERO_OVERLAP = 28;
/** A flick faster than this (px per ms) decides the direction on its own. */
const FLICK = 0.45;
const SNAP = "520ms cubic-bezier(0.22, 1, 0.36, 1)";

/**
 * The dashboard's two-state layout.
 *
 * Collapsed: the full hero, with a sheet peeking below it that shows only
 * `peek` (the chart). Swipe the sheet up — or tap its handle, or scroll
 * down with a wheel — and it rises to just below the hero's header row
 * (logo, month, +), which stays visible on its gradient, then scrolls
 * internally to reveal `details`. Swiping down from the top of that scroll
 * collapses it again.
 *
 * The hero marks its header with `data-hero-header` (where the open sheet
 * stops) and its body with `data-hero-content` (what fades away). Dragging
 * writes the sheet's transform and a `--sheet-p` progress variable
 * (0 collapsed → 1 expanded) straight to the DOM, so the hero body can fade
 * in step with the finger without React re-rendering on every touch move.
 * React state only changes on the snap.
 */
export function ExpandableSheet({
  hero,
  peek,
  details,
}: {
  hero: React.ReactNode;
  peek: (expanded: boolean) => React.ReactNode;
  details: React.ReactNode;
}) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const heroRef = React.useRef<HTMLDivElement>(null);

  const sheetRef = React.useRef<HTMLDivElement>(null);
  const scrollerRef = React.useRef<HTMLDivElement>(null);

  const [expanded, setExpanded] = React.useState(false);
  const expandedRef = React.useRef(false);
  /** Sheet offset (px below its expanded position) when collapsed. */
  const collapsedOffsetRef = React.useRef(0);
  const offsetRef = React.useRef(0);

  const apply = React.useCallback((offset: number, animate: boolean) => {
    const sheet = sheetRef.current;
    const root = rootRef.current;
    if (!sheet || !root) return;
    const range = collapsedOffsetRef.current || 1;
    offsetRef.current = offset;
    const transition = animate ? SNAP : "none";
    sheet.style.transition = `transform ${transition}`;
    root.style.transition = animate ? `--sheet-p ${SNAP}` : "none";
    sheet.style.transform = `translate3d(0, ${offset}px, 0)`;
    root.style.setProperty("--sheet-p", String(Math.min(Math.max(1 - offset / range, 0), 1)));
  }, []);

  const snapTo = React.useCallback(
    (next: boolean) => {
      expandedRef.current = next;
      setExpanded(next);
      if (!next && scrollerRef.current) scrollerRef.current.scrollTop = 0;
      apply(next ? 0 : collapsedOffsetRef.current, true);
    },
    [apply],
  );

  // Work out where "collapsed" is from the hero's height, and keep it right
  // as the viewport or the hero changes size.
  React.useLayoutEffect(() => {
    const root = rootRef.current;
    const heroEl = heroRef.current;
    if (!root || !heroEl) return;

    const measure = () => {
      // The open sheet stops a little below the hero's header row.
      const header = heroEl.querySelector<HTMLElement>("[data-hero-header]");
      const compactH = header ? header.offsetTop + header.offsetHeight + HEADER_GAP : 0;
      root.style.setProperty("--compact-h", `${compactH}px`);
      const ideal = heroEl.offsetHeight - HERO_OVERLAP - compactH;
      const room = root.clientHeight - MIN_PEEK - compactH;
      collapsedOffsetRef.current = Math.max(0, Math.min(ideal, room));
      apply(expandedRef.current ? 0 : collapsedOffsetRef.current, false);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    observer.observe(heroEl);
    return () => observer.disconnect();
  }, [apply]);

  // Touch dragging. Native listeners, because touchmove has to be
  // non-passive to stop the page from scrolling while the sheet is dragged.
  React.useEffect(() => {
    const sheet = sheetRef.current;
    const scroller = scrollerRef.current;
    if (!sheet || !scroller) return;

    let startY = 0;
    let startOffset = 0;
    let lastY = 0;
    let lastT = 0;
    let velocity = 0;
    let decided = false;
    let dragging = false;

    const onStart = (event: TouchEvent) => {
      startY = lastY = event.touches[0].clientY;
      lastT = event.timeStamp;
      startOffset = offsetRef.current;
      velocity = 0;
      decided = false;
      dragging = false;
    };

    const onMove = (event: TouchEvent) => {
      const y = event.touches[0].clientY;
      const dy = y - startY;

      if (!decided) {
        if (Math.abs(dy) < 6) return;
        decided = true;
        // Expanded, the sheet only drags down when its content is already
        // scrolled to the top; otherwise the content scrolls as normal.
        dragging = expandedRef.current ? scroller.scrollTop <= 0 && dy > 0 : true;
      }
      if (!dragging) return;

      event.preventDefault();
      const max = collapsedOffsetRef.current;
      let next = startOffset + dy;
      // Resist past either end instead of stopping dead.
      if (next < 0) next = next / 4;
      if (next > max) next = max + (next - max) / 4;
      apply(next, false);

      const dt = event.timeStamp - lastT;
      if (dt > 0) velocity = (y - lastY) / dt;
      lastY = y;
      lastT = event.timeStamp;
    };

    const onEnd = () => {
      if (!dragging) return;
      dragging = false;
      const max = collapsedOffsetRef.current;
      const next =
        velocity < -FLICK ? true : velocity > FLICK ? false : offsetRef.current < max / 2;
      snapTo(next);
    };

    sheet.addEventListener("touchstart", onStart, { passive: true });
    sheet.addEventListener("touchmove", onMove, { passive: false });
    sheet.addEventListener("touchend", onEnd);
    sheet.addEventListener("touchcancel", onEnd);
    return () => {
      sheet.removeEventListener("touchstart", onStart);
      sheet.removeEventListener("touchmove", onMove);
      sheet.removeEventListener("touchend", onEnd);
      sheet.removeEventListener("touchcancel", onEnd);
    };
  }, [apply, snapTo]);

  // Mouse wheel / trackpad, so the same gesture works on desktop.
  React.useEffect(() => {
    const sheet = sheetRef.current;
    const scroller = scrollerRef.current;
    if (!sheet || !scroller) return;
    let lockedUntil = 0;

    const onWheel = (event: WheelEvent) => {
      const now = performance.now();
      if (!expandedRef.current) {
        event.preventDefault();
        if (now > lockedUntil && event.deltaY > 4) {
          lockedUntil = now + 700;
          snapTo(true);
        }
      } else if (scroller.scrollTop <= 0 && event.deltaY < -4 && now > lockedUntil) {
        lockedUntil = now + 700;
        snapTo(false);
      }
    };

    sheet.addEventListener("wheel", onWheel, { passive: false });
    return () => sheet.removeEventListener("wheel", onWheel);
  }, [snapTo]);

  return (
    <div
      ref={rootRef}
      // The sheet runs its own touch and wheel gestures, so Lenis stays out.
      data-lenis-prevent
      className="reveal-target relative h-dvh overflow-hidden overscroll-none bg-black md:h-[calc(100dvh-3rem)] md:rounded-[2rem] md:border md:border-white/10"
      style={{ "--sheet-p": 0 } as React.CSSProperties}
    >
      {/* The hero. Its background and header row stay; its body fades,
          blurs and settles back as the sheet rises (see globals.css). */}
      <div
        ref={heroRef}
        className="sheet-hero absolute inset-x-0 top-0"
        data-expanded={expanded || undefined}
      >
        {hero}
      </div>

      {/* The sheet */}
      <div
        ref={sheetRef}
        className="absolute inset-x-0 bottom-0 z-10 flex flex-col rounded-t-[2rem] bg-[linear-gradient(180deg,#121316_0%,#060607_20rem,#000_100%)] shadow-[0_-1px_0_0_rgba(255,255,255,0.06),0_-20px_50px_-20px_rgba(0,0,0,0.8)] will-change-transform"
        style={{ top: "var(--compact-h, 0px)" }}
      >
        <button
          type="button"
          onClick={() => snapTo(!expanded)}
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse details" : "Expand details"}
          className="flex h-7 w-full shrink-0 cursor-grab items-center justify-center rounded-t-[2rem] active:cursor-grabbing"
        >
          <span className="h-1 w-10 rounded-full bg-white/20" />
        </button>

        <div
          ref={scrollerRef}
          className={cn(
            "min-h-0 flex-1 overscroll-contain px-5 sm:px-8",
            expanded ? "overflow-y-auto" : "overflow-hidden",
          )}
        >
          {peek(expanded)}

          {/* A nudge to swipe. It fades out and its space collapses as the
              sheet opens, so it doesn't leave a hole above the details. */}
          <div
            className="overflow-hidden"
            style={{ height: "calc((1 - var(--sheet-p)) * 3rem)" }}
          >
          <button
            type="button"
            onClick={() => snapTo(true)}
            tabIndex={expanded ? -1 : 0}
            className="mx-auto mt-5 flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] text-white/35 transition-colors hover:text-white/60"
            style={{ opacity: "calc(1 - var(--sheet-p) * 2)" }}
          >
            <ChevronUp className="size-3.5 animate-bounce [animation-duration:2s]" />
            Swipe up for details
          </button>
          </div>

          <div
            className="flex flex-col gap-10 pt-10 pb-[calc(7rem+env(safe-area-inset-bottom))]"
            style={{ opacity: "clamp(0, calc(var(--sheet-p) * 2 - 0.6), 1)" }}
            aria-hidden={!expanded || undefined}
          >
            {details}
          </div>
        </div>
      </div>
    </div>
  );
}
