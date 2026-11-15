"use client";

import { History, House, Settings, Tags, Target, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";

import { GlowBorder } from "@/components/ui/glow-border";
import { cn } from "@/lib/utils";

interface Route {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Left to right, with Home in the middle. The order also sets slide direction. */
const ROUTES: Route[] = [
  { href: "/history", label: "History", icon: History },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/", label: "Home", icon: House },
  { href: "/categories", label: "Categories", icon: Tags },
  { href: "/settings", label: "Settings", icon: Settings },
];

function isActiveRoute(href: string, pathname: string | null) {
  return href === "/" ? pathname === "/" : Boolean(pathname?.startsWith(href));
}

/**
 * Tab size and gap, in px. The indicator's position is computed from these.
 * 48px tabs meet the usual minimum touch target; each tab's hit area also
 * reaches a little past it (see the Link's ::after) so near-misses count.
 */
const SLOT = 48;
const GAP = 4;

/**
 * The app's navigation: a frosted, floating pill of route icons above the
 * home indicator, with Home in the centre.
 *
 * A single soft highlight sits behind the active tab and glides to the new
 * one on navigation with a springy overshoot, squishing as it travels, and
 * the newly active icon pops. Every slot is the same width, so the glide is
 * a plain translate.
 *
 * It can also be swiped: press anywhere on the pill and slide sideways, the
 * highlight follows the finger, and letting go opens the tab under it. A
 * plain tap still just follows the link.
 */
export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const currentIndex = ROUTES.findIndex((route) => isActiveRoute(route.href, pathname));
  const {
    listRef,
    handlers: scrubHandlers,
    offset: scrubOffset,
    index: scrubIndex,
    onLinkClick,
  } = useNavScrub({
    currentIndex,
    onSelect: (index) => router.push(ROUTES[index].href),
  });
  // While swiping, or until the tapped-to route loads, show that tab as active.
  const shownIndex = scrubIndex ?? currentIndex;

  return (
    <nav
      aria-label="Main"
      // Just above the home-indicator area: the inset minus a little, but
      // never closer than 1rem to the edge.
      className="reveal-nav pointer-events-none fixed inset-x-0 bottom-[max(1rem,calc(env(safe-area-inset-bottom)-0.25rem))] z-40 flex justify-center px-4"
    >
      <div className="relative">
      {/*
        A very soft blue glow behind the pill, in the hero's blue. It is a
        radial gradient rather than a blur filter, so it costs nothing on
        mobile, and a sibling of the pill rather than its parent, so the
        pill's backdrop blur still reaches the page (and diffuses the glow).
      */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -inset-x-10 -inset-y-6"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 55%, rgba(59,130,246,0.16) 0%, rgba(59,130,246,0.06) 45%, rgba(59,130,246,0) 75%)",
        }}
      />
      <ul
        ref={listRef}
        {...scrubHandlers}
        // touch-none: a sideways swipe drives the highlight instead of
        // scrolling or triggering the browser's back gesture.
        className="pointer-events-auto relative flex touch-none items-center select-none rounded-full bg-[#1a1b20]/40 p-1.5 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(169,196,255,0.2)] ring-1 ring-[#a9c4ff]/15 backdrop-blur-xl backdrop-saturate-[1.8]"
        style={{
          gap: GAP,
          // A faint blue wash, brightest along the top edge.
          backgroundImage:
            "linear-gradient(180deg, rgba(75,122,214,0.16) 0%, rgba(75,122,214,0.04) 60%, rgba(75,122,214,0.02) 100%)",
          WebkitBackdropFilter: "blur(24px) saturate(1.8)",
          // Its own compositing layer, so iOS keeps the fixed bar pinned while
          // the page scrolls. It lives on the pill, not the <nav>: a transform
          // on an ancestor would cut the backdrop blur off from the page.
          transform: "translateZ(0)",
        }}
      >
        {/* The gliding highlight: it springs past its target and settles
            back, while the inner blob squishes as it travels. */}
        {(shownIndex !== -1 || scrubOffset !== null) && (
          <li
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute top-1.5 left-1.5",
              // Glued to the finger while swiping; springs everywhere else.
              scrubOffset === null &&
                "transition-transform duration-[560ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none",
            )}
            style={{
              width: SLOT,
              height: SLOT,
              transform: `translateX(${scrubOffset ?? shownIndex * (SLOT + GAP)}px)`,
            }}
          >
            <span
              // Re-keyed on every move so the squish replays each time (not
              // mid-swipe, where it would replay on every slot crossed).
              key={scrubOffset === null ? shownIndex : "scrub"}
              className="nav-blob block size-full rounded-full bg-white/[0.13] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.14),0_4px_14px_-4px_rgba(0,0,0,0.6)] ring-1 ring-white/10"
            />
          </li>
        )}

        {ROUTES.map((route, index) => {
          const isActive = index === shownIndex;
          const Icon = route.icon;

          return (
            <li key={route.href} className="relative">
              <Link
                href={route.href}
                onClick={onLinkClick}
                draggable={false}
                aria-label={route.label}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  // ::after widens the hit area: up and down past the pill's
                  // padding, and sideways across half the gap to each neighbour.
                  "relative flex items-center justify-center rounded-full transition-[color,transform] after:absolute after:-inset-x-0.5 after:-inset-y-2.5 duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-90",
                  isActive ? "text-white" : "text-white/50 hover:text-white/80",
                )}
                style={{ width: SLOT, height: SLOT }}
              >
                <Icon
                  // Re-keyed when it becomes active so the pop plays.
                  key={isActive ? "active" : "idle"}
                  className={cn("size-[1.15rem]", isActive && "nav-pop")}
                  strokeWidth={isActive ? 2.1 : 1.8}
                />
              </Link>
            </li>
          );
        })}
      </ul>
      {/* A slow light circling the pill's edge (a sibling, so the blur works). */}
      <GlowBorder radius="rounded-full" />
      </div>
    </nav>
  );
}

/** Movement, in px, before a press counts as a swipe rather than a tap. */
const SWIPE_THRESHOLD = 8;

/**
 * Swipe-to-switch for the nav pill. Pointer events on the <ul>: once a press
 * moves sideways past SWIPE_THRESHOLD, the highlight tracks the finger
 * (`offset`, px from the first slot) and the slot under it becomes the shown
 * tab (`index`). Releasing selects it. The click that follows a swipe is
 * swallowed so the link under the finger doesn't also navigate.
 */
function useNavScrub({
  currentIndex,
  onSelect,
}: {
  currentIndex: number;
  onSelect: (index: number) => void;
}) {
  const listRef = React.useRef<HTMLUListElement>(null);
  const [offset, setOffset] = React.useState<number | null>(null);
  const [index, setIndex] = React.useState<number | null>(null);
  const gesture = React.useRef<{ id: number; startX: number; swiping: boolean } | null>(null);
  /** Clicks before this time (ms) follow a swipe and are ignored. */
  const swallowClicksUntil = React.useRef(0);
  const lastIndex = React.useRef<number | null>(null);

  // Once the chosen route has loaded, the pathname takes over again.
  React.useEffect(() => {
    if (gesture.current?.swiping) return;
    setIndex(null);
  }, [currentIndex]);

  const step = SLOT + GAP;
  const maxOffset = (ROUTES.length - 1) * step;

  function track(clientX: number) {
    const list = listRef.current;
    if (!list) return;
    // The highlight's left edge, centred under the finger.
    const left = clientX - list.getBoundingClientRect().left - 6 - SLOT / 2;
    const clamped = Math.min(Math.max(left, 0), maxOffset);
    const next = Math.round(clamped / step);
    setOffset(clamped);
    setIndex(next);
    if (next !== lastIndex.current) {
      lastIndex.current = next;
      // A tiny tick per tab crossed, where the device supports it.
      navigator.vibrate?.(6);
    }
  }

  const handlers = {
    onPointerDown(event: React.PointerEvent<HTMLUListElement>) {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      gesture.current = { id: event.pointerId, startX: event.clientX, swiping: false };
    },
    onPointerMove(event: React.PointerEvent<HTMLUListElement>) {
      const g = gesture.current;
      if (!g || g.id !== event.pointerId) return;
      if (!g.swiping) {
        if (Math.abs(event.clientX - g.startX) < SWIPE_THRESHOLD) return;
        g.swiping = true;
        lastIndex.current = currentIndex;
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      track(event.clientX);
    },
    onPointerUp(event: React.PointerEvent<HTMLUListElement>) {
      const g = gesture.current;
      gesture.current = null;
      if (!g || g.id !== event.pointerId || !g.swiping) return;
      // The click (if any) fires right after pointerup; a short window
      // catches it without eating a later, real tap.
      swallowClicksUntil.current = event.timeStamp + 400;
      setOffset(null);
      const target = lastIndex.current;
      if (target === null || target === currentIndex) {
        setIndex(null);
        return;
      }
      // Keep showing the target until its route loads (see the effect).
      setIndex(target);
      onSelect(target);
    },
    onPointerCancel() {
      gesture.current = null;
      setOffset(null);
      setIndex(null);
    },
  };

  function onLinkClick(event: React.MouseEvent) {
    if (event.timeStamp < swallowClicksUntil.current) event.preventDefault();
  }

  return { listRef, handlers, offset, index, onLinkClick };
}
