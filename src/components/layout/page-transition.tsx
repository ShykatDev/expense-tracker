import { ViewTransition } from "react";

/**
 * Transition types attached to navigations (via `<Link transitionTypes>` or
 * `router.push(href, { transitionTypes })`). Each page wrapper maps them to
 * the CSS animations in globals.css.
 */
export const TRANSITION = {
  /** Moving to a tab to the right in the bottom navigation. */
  tabForward: ["tab-forward"],
  /** Moving to a tab to the left. */
  tabBack: ["tab-back"],
  /** Opening the add/edit screen, which rises like a sheet. */
  sheetUp: ["sheet-up"],
  /** Closing it again. */
  sheetDown: ["sheet-down"],
} as const;

/**
 * Wraps a page's content so route changes animate: tabs slide sideways in
 * the direction of travel, and the entry screen rises and falls like a sheet
 * while the page behind recedes. It lives in each page, not the layout,
 * because layouts persist and never enter or exit.
 *
 * Navigations without a type (browser back, refreshes) don't animate.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition
      enter={{
        "tab-forward": "tab-forward",
        "tab-back": "tab-back",
        "sheet-up": "sheet-up",
        "sheet-down": "page-return",
        default: "none",
      }}
      exit={{
        "tab-forward": "tab-forward",
        "tab-back": "tab-back",
        "sheet-up": "page-recede",
        "sheet-down": "sheet-down",
        default: "none",
      }}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
