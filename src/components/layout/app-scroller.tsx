"use client";

import { usePathname } from "next/navigation";
import * as React from "react";

/**
 * The app's one scroll container.
 *
 * The document itself never scrolls: the frame around this is exactly the
 * viewport height. That keeps mobile Safari's toolbar from collapsing and
 * expanding as different pages scroll, which is what made the fixed bottom
 * navigation shift between pages, and it stops the page-level bounce from
 * dragging the navigation along. Each page scrolls in here with native
 * momentum instead.
 *
 * Because this container persists across routes, it scrolls back to the top
 * whenever the route changes.
 */
export function AppScroller({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<HTMLElement>(null);
  const pathname = usePathname();

  React.useEffect(() => {
    ref.current?.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <main
      ref={ref}
      className="app-scroller h-full overflow-y-auto overscroll-contain"
    >
      {children}
    </main>
  );
}
