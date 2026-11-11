"use client";

import { History, House, Settings, Tags, Target, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { TRANSITION } from "@/components/layout/page-transition";
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
 * The app's navigation: a frosted, floating pill of route icons above the
 * home indicator, with Home in the centre. The active page takes a soft tint
 * of the hero's blue. Every slot is a fixed width so Home stays dead centre.
 *
 * Each link tags its navigation as moving right or left of the current tab,
 * which `PageTransition` turns into a matching slide. The pill is named for
 * view transitions so it stays put while pages slide beneath it.
 */
export function BottomNav() {
  const pathname = usePathname();
  const currentIndex = ROUTES.findIndex((route) => isActiveRoute(route.href, pathname));

  return (
    <nav
      aria-label="Main"
      className="reveal-nav pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex justify-center px-4"
    >
      {/*
        The view-transition name sits on the pill itself, not the <nav>: an
        ancestor with a view-transition-name becomes a "backdrop root", which
        would leave the blur nothing behind it to blur.
      */}
      <ul
        className="pointer-events-auto flex items-center gap-1 rounded-full bg-[#1a1b20]/40 p-1.5 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.12)] ring-1 ring-white/12 backdrop-blur-xl backdrop-saturate-[1.8]"
        style={{
          viewTransitionName: "bottom-nav",
          WebkitBackdropFilter: "blur(24px) saturate(1.8)",
        }}
      >
        {ROUTES.map((route, index) => {
          const isActive = index === currentIndex;
          const direction =
            currentIndex === -1 || index === currentIndex
              ? undefined
              : index > currentIndex
                ? [...TRANSITION.tabForward]
                : [...TRANSITION.tabBack];
          const Icon = route.icon;

          return (
            <li key={route.href}>
              <Link
                href={route.href}
                transitionTypes={direction}
                aria-label={route.label}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex items-center justify-center rounded-full transition-[background-color,color,box-shadow,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-90",
                  "size-11",
                  isActive
                    ? "bg-[#2a55b0]/30 text-[#a9c4ff] ring-1 ring-[#6f97e6]/30"
                    : "text-white/50 hover:bg-white/8 hover:text-white/85",
                )}
              >
                <Icon className="size-[1.15rem]" strokeWidth={isActive ? 2.1 : 1.8} />
                {/* A small dot under the active tab, for a second cue. */}
                {isActive && (
                  <span className="absolute bottom-1 size-1 rounded-full bg-[#a9c4ff] animate-in fade-in zoom-in duration-300" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
