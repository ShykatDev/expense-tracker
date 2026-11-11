import { BalanceSummaryProvider } from "@/components/dashboard/balance-summary-store";
import { MonthNavProvider } from "@/components/dashboard/navbar";

/**
 * Every app page draws its own hero and sheet (see `AppShell`), so the layout
 * only centres a phone-width column and hosts the shared month state.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col md:py-6">
      <BalanceSummaryProvider>
        <MonthNavProvider>{children}</MonthNavProvider>
      </BalanceSummaryProvider>
    </div>
  );
}
