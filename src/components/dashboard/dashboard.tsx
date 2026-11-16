"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { useCategories } from "@/components/categories/categories-provider";
import { useTargets } from "@/components/targets/targets-provider";
import {
  computeTotals,
  formatCurrency,
  isWithinDateRange,
  type DateRangeFilter,
  type Transaction,
} from "@/lib/transactions";
import { SheetButton, SheetSection } from "@/components/layout/app-shell";
import { getSavingsVerdict } from "@/lib/savings";
import { monthKey } from "@/lib/targets";
import { findBudgetAlerts } from "@/lib/budget-alerts";

import { usePublishBalance } from "./balance-summary-store";
import { AccountBalances } from "./account-balances";
import { BudgetAlerts } from "./budget-alerts";
import { useDeleteTransaction } from "./use-delete-transaction";
import { DashboardHero } from "./dashboard-hero";
import { ExpandableSheet } from "@/components/layout/expandable-sheet";
import { MonthlyRecap } from "./monthly-recap";
import { RecurringDueCard } from "@/components/recurring/recurring-due-card";
import { useMonthNav } from "./navbar";
import { SpendingCalendar } from "./spending-calendar";
import { SpendingAnalytics, SpentCategories } from "./spending-analytics";
import { TargetsList } from "./targets-list";
import { TransactionHistory } from "./transaction-history";
import { useTransactions } from "./transactions-provider";


function startOfMonth(monthOffset: number) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
}

export function Dashboard() {
  const { transactions } = useTransactions();
  const { monthAnchor } = useMonthNav();
  const [filter, setFilter] = React.useState<DateRangeFilter>("month");

  const monthOffset = React.useMemo(() => {
    const now = new Date();
    return (
      (monthAnchor.getFullYear() - now.getFullYear()) * 12 +
      (monthAnchor.getMonth() - now.getMonth())
    );
  }, [monthAnchor]);

  // Picking a month in the navbar always scopes the dashboard to that month.
  const isFirstMonthRender = React.useRef(true);
  React.useEffect(() => {
    if (isFirstMonthRender.current) {
      isFirstMonthRender.current = false;
      return;
    }
    setFilter("month");
  }, [monthAnchor]);

  const filteredTransactions = React.useMemo(
    () =>
      transactions.filter((t) =>
        isWithinDateRange(t.createdAt, filter, monthAnchor),
      ),
    [transactions, filter, monthAnchor],
  );

  const totals = React.useMemo(
    () => computeTotals(filteredTransactions),
    [filteredTransactions],
  );

  // Targets are monthly caps, so they are always measured against the
  // navbar's month regardless of which date chip the user picked.
  const monthTransactions = React.useMemo(
    () =>
      transactions.filter((t) =>
        isWithinDateRange(t.createdAt, "month", monthAnchor),
      ),
    [transactions, monthAnchor],
  );

  const spentByCategoryLabel = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const transaction of monthTransactions) {
      if (transaction.type !== "expense") continue;
      map[transaction.category] =
        (map[transaction.category] ?? 0) + transaction.amount;
    }
    return map;
  }, [monthTransactions]);

  const previousMonthAnchor = React.useMemo(
    () => startOfMonth(monthOffset - 1),
    [monthOffset],
  );

  const previousTransactions = React.useMemo(() => {
    if (filter === "all") return [];

    if (filter === "month") {
      return transactions.filter((t) =>
        isWithinDateRange(t.createdAt, "month", previousMonthAnchor),
      );
    }

    const now = new Date();

    if (filter === "today") {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return transactions.filter(
        (t) =>
          new Date(t.createdAt).toDateString() === yesterday.toDateString(),
      );
    }

    const currentWeekStart = new Date(now);
    currentWeekStart.setHours(0, 0, 0, 0);
    currentWeekStart.setDate(currentWeekStart.getDate() - 6);
    const previousWeekEnd = new Date(currentWeekStart.getTime() - 1);
    const previousWeekStart = new Date(previousWeekEnd);
    previousWeekStart.setHours(0, 0, 0, 0);
    previousWeekStart.setDate(previousWeekStart.getDate() - 6);
    return transactions.filter(
      (t) =>
        t.createdAt >= previousWeekStart.getTime() &&
        t.createdAt <= previousWeekEnd.getTime(),
    );
  }, [transactions, filter, previousMonthAnchor]);

  const previousTotals = React.useMemo(
    () => computeTotals(previousTransactions),
    [previousTransactions],
  );

  // The verdict compares this month with the one before it, when there is
  // anything logged for that month.
  const previousMonthSavings = React.useMemo(() => {
    const previous = transactions.filter((t) =>
      isWithinDateRange(t.createdAt, "month", previousMonthAnchor),
    );
    return previous.length > 0 ? computeTotals(previous).balance : null;
  }, [transactions, previousMonthAnchor]);

  // Savings is a monthly figure, so it is always measured against the
  // navbar's month rather than the date chip.
  const monthTotals = React.useMemo(
    () => computeTotals(monthTransactions),
    [monthTransactions],
  );

  const balanceChangePercent = React.useMemo(() => {
    if (filter === "all") return null;
    const diff = totals.balance - previousTotals.balance;
    if (previousTotals.balance !== 0)
      return (diff / Math.abs(previousTotals.balance)) * 100;
    return totals.balance === 0 ? 0 : 100;
  }, [filter, totals.balance, previousTotals.balance]);

  const balanceSummary = React.useMemo(
    () => ({
      balance: totals.balance,
      changePercent: balanceChangePercent,
    }),
    [totals.balance, balanceChangePercent],
  );

  usePublishBalance(balanceSummary);

  return (
    <DashboardContent
      allTransactions={transactions}
      monthTotals={monthTotals}
      monthTransactions={monthTransactions}
      previousMonthSavings={previousMonthSavings}
      spentByCategoryLabel={spentByCategoryLabel}
      monthAnchor={monthAnchor}
      monthKey={monthKey(monthAnchor)}
    />
  );
}

function DashboardContent({
  allTransactions,
  monthTotals,
  monthTransactions,
  previousMonthSavings,
  spentByCategoryLabel,
  monthAnchor,
  monthKey: currentMonthKey,
}: {
  allTransactions: Transaction[];
  monthTotals: { income: number; expense: number; balance: number };
  monthTransactions: Transaction[];
  previousMonthSavings: number | null;
  spentByCategoryLabel: Record<string, number>;
  monthAnchor: Date;
  monthKey: string;
}) {
  const router = useRouter();
  const { categories } = useCategories();
  const { targets } = useTargets();
  const deleteTransaction = useDeleteTransaction();

  const allCustomCategories = React.useMemo(
    () => [...categories.income, ...categories.expense],
    [categories.income, categories.expense],
  );

  // Home lists only today's entries, newest first; History has the rest.
  const todayTransactions = React.useMemo(
    () =>
      allTransactions
        .filter((t) => isWithinDateRange(t.createdAt, "today", monthAnchor))
        .sort((a, b) => b.createdAt - a.createdAt),
    [allTransactions, monthAnchor],
  );
  const todaySpent = todayTransactions.reduce(
    (sum, t) => (t.type === "expense" ? sum + t.amount : sum),
    0,
  );

  // Targets at or past 80% of the navbar month's cap, for the alert strip.
  const budgetAlerts = React.useMemo(
    () =>
      findBudgetAlerts({
        targets,
        monthKey: currentMonthKey,
        spentByLabel: spentByCategoryLabel,
        customCategories: allCustomCategories,
      }),
    [targets, currentMonthKey, spentByCategoryLabel, allCustomCategories],
  );

  const verdict = React.useMemo(
    () =>
      getSavingsVerdict({
        income: monthTotals.income,
        expense: monthTotals.expense,
        previousSavings: previousMonthSavings,
      }),
    [monthTotals.income, monthTotals.expense, previousMonthSavings],
  );


  return (
    <>
      <ExpandableSheet
        hero={
          <DashboardHero
            savings={monthTotals.balance}
            income={monthTotals.income}
            expense={monthTotals.expense}
            verdict={verdict}
          />
        }
        peek={(expanded) => (
          <SpendingAnalytics
            transactions={allTransactions}
            monthAnchor={monthAnchor}
            detailed={expanded}
          />
        )}
        details={
          <>
            {/* Time-sensitive cards first: recurring entries waiting to be
                confirmed, last month's recap, then budget warnings. Each
                renders nothing when it has nothing to say. */}
            <RecurringDueCard />

            <MonthlyRecap transactions={allTransactions} />

            <BudgetAlerts alerts={budgetAlerts} />

            {/* Balance per account; hidden while Cash is the only one. */}
            <AccountBalances />

            <SpentCategories
              transactions={monthTransactions}
              customCategories={allCustomCategories}
            />

            <SpendingCalendar
              transactions={monthTransactions}
              monthAnchor={monthAnchor}
            />

            <TargetsList
              monthKey={currentMonthKey}
              spentByCategoryLabel={spentByCategoryLabel}
              targets={targets}
              customCategories={allCustomCategories}
            />

            <SheetSection
              title="Today"
              subtitle={
                todayTransactions.length > 0
                  ? `${todayTransactions.length} ${todayTransactions.length === 1 ? "entry" : "entries"}${todaySpent > 0 ? ` · ${formatCurrency(todaySpent)} spent` : ""}`
                  : undefined
              }
              action={
                <SheetButton onClick={() => router.push("/history")}>See all</SheetButton>
              }
            >
              <TransactionHistory
                transactions={todayTransactions}
                showDayHeaders={false}
                customCategories={allCustomCategories}
                onEdit={(transaction) =>
                  router.push(`/transaction?edit=${transaction.id}`)
                }
                onDelete={deleteTransaction}
                emptyMessage="Nothing added today yet."
              />
            </SheetSection>
          </>
        }
      />

    </>
  );
}
