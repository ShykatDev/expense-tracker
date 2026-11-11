import { BalanceSummaryProvider } from "@/components/dashboard/balance-summary-store";
import { BottomActionBar } from "@/components/dashboard/bottom-action-bar";
import { MonthNavProvider, Navbar } from "@/components/dashboard/navbar";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex w-full flex-1 flex-col px-4 sm:px-8 md:px-16 lg:px-96 xl:px-96 2xl:px-96">
      <BalanceSummaryProvider>
        <MonthNavProvider>
          <Navbar />
          {children}
        </MonthNavProvider>
        <BottomActionBar />
      </BalanceSummaryProvider>
    </div>
  );
}
