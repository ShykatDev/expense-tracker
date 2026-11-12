"use client";

import { History, House, Settings, Tags, Target, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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

/** Tab size and gap, in px. The indicator's position is computed from these. */
const SLOT = 44;
const GAP = 4;

/**
 * The app's navigation: a frosted, floating pill of route icons above the
 * home indicator, with Home in the centre.
 *
 * A single soft highlight sits behind the active tab and glides to the new
 * one on navigation with a springy overshoot, squishing as it travels, and
 * the newly active icon pops. Every slot is the same width, so the glide is
 * a plain translate.

 */
export function BottomNav() {
  const pathname = usePathname();
  const currentIndex = ROUTES.findIndex((route) => isActiveRoute(route.href, pathname));

  return (
    <nav
      aria-label="Main"
      // Tucked into the home-indicator area: the inset minus a little, but
      // never closer than 0.5rem to the edge.
      className="reveal-nav pointer-events-none fixed inset-x-0 bottom-[max(0.5rem,calc(env(safe-area-inset-bottom)-0.75rem))] z-40 flex justify-center px-4"
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
        className="pointer-events-auto relative flex items-center rounded-full bg-[#1a1b20]/40 p-1.5 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(169,196,255,0.2)] ring-1 ring-[#a9c4ff]/15 backdrop-blur-xl backdrop-saturate-[1.8]"
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
        {currentIndex !== -1 && (
          <li
            aria-hidden="true"
            className="pointer-events-none absolute top-1.5 left-1.5 transition-transform duration-[560ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none"
            style={{
              width: SLOT,
              height: SLOT,
              transform: `translateX(${currentIndex * (SLOT + GAP)}px)`,
            }}
          >
            <span
              // Re-keyed on every move so the squish replays each time.
              key={currentIndex}
              className="nav-blob block size-full rounded-full bg-white/[0.13] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.14),0_4px_14px_-4px_rgba(0,0,0,0.6)] ring-1 ring-white/10"
            />
          </li>
        )}

        {ROUTES.map((route, index) => {
          const isActive = index === currentIndex;
          const Icon = route.icon;

          return (
            <li key={route.href} className="relative">
              <Link
                href={route.href}
                aria-label={route.label}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center justify-center rounded-full transition-[color,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-90",
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
