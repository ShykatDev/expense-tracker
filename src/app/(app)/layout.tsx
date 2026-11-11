import { BalanceSummaryProvider } from "@/components/dashboard/balance-summary-store";
import { MonthNavProvider } from "@/components/dashboard/navbar";
import { BottomNav } from "@/components/layout/bottom-nav";

/**
 * Every app page draws its own hero and sheet (see `AppShell`), so the layout
 * only centres a phone-width column, hosts the shared month state and shows
 * the floating bottom navigation.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col md:py-6">
      <BalanceSummaryProvider>
        <MonthNavProvider>{children}</MonthNavProvider>
        <BottomNav />
      </BalanceSummaryProvider>
    </div>
  );
}
