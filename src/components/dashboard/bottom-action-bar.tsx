"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";

import { BalanceTrend } from "@/components/dashboard/balance-trend";
import { useBalanceSummaryStore } from "@/components/dashboard/balance-summary-store";
import { Button } from "@/components/ui/button";

export function BottomActionBar() {
  const router = useRouter();
  const { summary } = useBalanceSummaryStore();
  const { balance, changePercent } = summary;
  const pathname = usePathname();

  // The dashboard has its own add button in the hero.
  if (pathname === "/") return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-8 md:px-16 lg:px-96 xl:px-96 2xl:px-96">
      <section className="solid-panel mx-auto flex max-w-xl items-center gap-2 rounded-2xl border border-white/10 p-2.5 shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset,0_8px_30px_-8px_rgba(0,0,0,0.6)]">
        <BalanceTrend balance={balance} changePercent={changePercent} />
        <div className="flex shrink-0 gap-1.5">
          <Button
            size="lg"
            aria-label="Add income"
            className="gap-1 border-emerald-500/25 bg-emerald-500/15 text-emerald-400 active:scale-[0.98] hover:bg-emerald-500/25"
            onClick={() => router.push("/transaction?type=income")}
          >
            <ArrowUpRight className="size-4" />
            Income
          </Button>
          <Button
            size="lg"
            aria-label="Add expense"
            className="gap-1 border-rose-500/25 bg-rose-500/15 text-rose-400 active:scale-[0.98] hover:bg-rose-500/25"
            onClick={() => router.push("/transaction?type=expense")}
          >
            <ArrowDownRight className="size-4" />
            Expense
          </Button>
        </div>
      </section>
    </div>
  );
}
