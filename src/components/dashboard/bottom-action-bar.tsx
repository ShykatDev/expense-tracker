"use client";

import * as React from "react";

import { BalanceTrend } from "@/components/dashboard/balance-trend";
import { useBalanceSummaryStore } from "@/components/dashboard/balance-summary-store";
import { ExpenseDrawer } from "@/components/dashboard/expense-drawer";
import { IncomeDrawer } from "@/components/dashboard/income-drawer";
import { useTransactions } from "@/components/dashboard/transactions-provider";
import { useCategories } from "@/components/categories/categories-provider";
import { resolveCategories } from "@/lib/categories";

export function BottomActionBar() {
  const { addTransactions } = useTransactions();
  const { categories, hidden: hiddenCategories } = useCategories();
  const { summary } = useBalanceSummaryStore();
  const { balance, changePercent } = summary;

  const incomeCategories = React.useMemo(
    () => resolveCategories("income", categories.income),
    [categories.income],
  );
  const expenseCategories = React.useMemo(
    () => resolveCategories("expense", categories.expense),
    [categories.expense],
  );

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-8 md:px-16 lg:px-96 xl:px-96 2xl:px-96">
      <section className="solid-panel mx-auto flex max-w-xl items-center gap-2 rounded-2xl border border-white/10 p-2.5 shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset,0_8px_30px_-8px_rgba(0,0,0,0.6)]">
        <BalanceTrend balance={balance} changePercent={changePercent} />
        <div className="flex shrink-0 gap-1.5">
          <IncomeDrawer
            onSubmit={(entries) =>
              addTransactions(
                entries.map((entry) => ({ ...entry, type: "income" })),
              )
            }
            categories={incomeCategories}
            hiddenCategories={hiddenCategories.income}
          />
          <ExpenseDrawer
            onSubmit={(entries) =>
              addTransactions(
                entries.map((entry) => ({ ...entry, type: "expense" })),
              )
            }
            categories={expenseCategories}
            hiddenCategories={hiddenCategories.expense}
          />
        </div>
      </section>
    </div>
  );
}
