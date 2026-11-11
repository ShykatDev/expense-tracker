"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useCategories } from "@/components/categories/categories-provider";
import { useTargets } from "@/components/targets/targets-provider";
import {
  computeTotals,
  isWithinDateRange,
  type DateRangeFilter,
  type Transaction,
} from "@/lib/transactions";
import { AppSheet, AppShell, SheetButton, SheetSection } from "@/components/layout/app-shell";
import { getSavingsVerdict } from "@/lib/savings";
import { monthKey } from "@/lib/targets";

import { usePublishBalance } from "./balance-summary-store";
import { ConfirmTransactionActionDialog } from "./confirm-transaction-action";
import { DashboardHero } from "./dashboard-hero";
import { useMonthNav } from "./navbar";
import { SpendingAnalytics, SpentCategories } from "./spending-analytics";
import { TargetsList } from "./targets-list";
import { TransactionHistory } from "./transaction-history";
import { useTransactions } from "./transactions-provider";

/** How many entries the dashboard previews before "See all". */
const RECENT_COUNT = 5;

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
  const { removeTransaction } = useTransactions();
  const { categories } = useCategories();
  const { targets } = useTargets();
  const [deletingTransaction, setDeletingTransaction] =
    React.useState<Transaction | null>(null);

  const allCustomCategories = React.useMemo(
    () => [...categories.income, ...categories.expense],
    [categories.income, categories.expense],
  );

  const recentTransactions = React.useMemo(
    () =>
      [...monthTransactions]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, RECENT_COUNT),
    [monthTransactions],
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

  function handleConfirmDelete() {
    if (!deletingTransaction) return;
    removeTransaction(deletingTransaction.id);
    toast.success(`Deleted ${deletingTransaction.type} entry`);
    setDeletingTransaction(null);
  }

  return (
    <>
      <AppShell>
        <DashboardHero
          savings={monthTotals.balance}
          income={monthTotals.income}
          expense={monthTotals.expense}
          verdict={verdict}
        />

        <AppSheet>
          <SpendingAnalytics
            transactions={allTransactions}
            monthAnchor={monthAnchor}
          />

          <SpentCategories
            transactions={monthTransactions}
            customCategories={allCustomCategories}
          />

          <TargetsList
            monthKey={currentMonthKey}
            spentByCategoryLabel={spentByCategoryLabel}
            targets={targets}
            customCategories={allCustomCategories}
          />

          <SheetSection
            title="Recent transactions"
            subtitle={
              monthTransactions.length > RECENT_COUNT
                ? `Latest ${RECENT_COUNT} of ${monthTransactions.length} this month`
                : undefined
            }
            action={
              <SheetButton onClick={() => router.push("/history")}>See all</SheetButton>
            }
          >
            <TransactionHistory
              transactions={recentTransactions}
              customCategories={allCustomCategories}
              onEdit={(transaction) =>
                router.push(`/transaction?edit=${transaction.id}`)
              }
              onDelete={setDeletingTransaction}
              emptyMessage="No transactions this month yet."
            />
          </SheetSection>
        </AppSheet>
      </AppShell>

      <ConfirmTransactionActionDialog
        open={deletingTransaction !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingTransaction(null);
        }}
        action="delete"
        transaction={deletingTransaction}
        customCategories={allCustomCategories}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
