import { BalanceSummaryProvider } from "@/components/dashboard/balance-summary-store";
import { MonthNavProvider } from "@/components/dashboard/navbar";
import { AppScroller } from "@/components/layout/app-scroller";
import { BottomNav } from "@/components/layout/bottom-nav";

/**
 * The app frame: exactly the viewport's height, so the document never
 * scrolls. Pages scroll inside `AppScroller`, which keeps the fixed bottom
 * navigation steady on mobile (no toolbar collapse, no page bounce).
 *
 * Inside, a column holds each page's own hero and sheet (see
 * `ExpandableSheet`), alongside the shared month state and the navigation.
 * Below `md` the column fills the screen; from `md` up it is capped at
 * phone width (430px) and centred.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="h-dvh w-full overflow-hidden">
      <BalanceSummaryProvider>
        <MonthNavProvider>
          <AppScroller>
            <div className="mx-auto flex min-h-full w-full flex-col md:max-w-[430px] md:py-6">
              {children}
            </div>
          </AppScroller>
        </MonthNavProvider>
        <BottomNav />
      </BalanceSummaryProvider>
    </div>
  );
}
