"use client";

import * as React from "react";
import { toast } from "sonner";

import { useCategories } from "@/components/categories/categories-provider";
import { useTargets } from "@/components/targets/targets-provider";
import {
  computeCategoryTotals,
  computeTotals,
  isWithinDateRange,
  type DateRangeFilter,
  type Transaction,
} from "@/lib/transactions";
import { monthKey } from "@/lib/targets";

import { BalanceOverviewCard } from "./balance-overview-card";
import { usePublishBalance } from "./balance-summary-store";
import { ConfirmTransactionActionDialog } from "./confirm-transaction-action";
import { DateFilters } from "./date-filters";
import { EditTransactionDrawer } from "./edit-transaction-drawer";
import { useMonthNav } from "./navbar";
import { SavingsCard } from "./savings-card";
import { StatCards } from "./stat-cards";
import { TargetSummaryCard } from "./target-summary-card";
import { TransactionHistory } from "./transaction-history";
import { useTransactions } from "./transactions-provider";
import { ViewTabs, type DashboardView } from "./view-tabs";

function startOfMonth(monthOffset: number) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
}

export function Dashboard() {
  const { transactions } = useTransactions();
  const { monthAnchor, monthLabel } = useMonthNav();
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

  // Savings is a running total across every transaction, so it is always
  // computed from the full ledger rather than the filtered view.
  const lifetimeTotals = React.useMemo(
    () => computeTotals(transactions),
    [transactions],
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
      filter={filter}
      onFilterChange={setFilter}
      transactions={filteredTransactions}
      totals={totals}
      lifetimeTotals={lifetimeTotals}
      spentByCategoryLabel={spentByCategoryLabel}
      monthLabel={monthLabel}
      monthKey={monthKey(monthAnchor)}
    />
  );
}

function DashboardContent({
  filter,
  onFilterChange,
  transactions: filteredTransactions,
  totals,
  lifetimeTotals,
  spentByCategoryLabel,
  monthLabel,
  monthKey: currentMonthKey,
}: {
  filter: DateRangeFilter;
  onFilterChange: (filter: DateRangeFilter) => void;
  transactions: Transaction[];
  totals: { income: number; expense: number; balance: number };
  lifetimeTotals: { income: number; expense: number; balance: number };
  spentByCategoryLabel: Record<string, number>;
  monthLabel: string;
  monthKey: string;
}) {
  const { transactions, removeTransaction, updateTransaction } =
    useTransactions();
  const { categories } = useCategories();
  const { targets } = useTargets();
  const [view, setView] = React.useState<DashboardView>("overview");
  const [editingTransaction, setEditingTransaction] =
    React.useState<Transaction | null>(null);
  const [pendingUpdate, setPendingUpdate] = React.useState<{
    transaction: Transaction;
    category: string;
    amount: number;
  } | null>(null);
  const [deletingTransaction, setDeletingTransaction] =
    React.useState<Transaction | null>(null);

  const categoryTotals = React.useMemo(
    () => computeCategoryTotals(filteredTransactions),
    [filteredTransactions],
  );

  const allCustomCategories = React.useMemo(
    () => [...categories.income, ...categories.expense],
    [categories.income, categories.expense],
  );

  function handleConfirmUpdate() {
    if (!pendingUpdate) return;
    updateTransaction(pendingUpdate.transaction.id, {
      category: pendingUpdate.category,
      amount: pendingUpdate.amount,
    });
    toast.success("Entry updated");
    setPendingUpdate(null);
  }

  function handleConfirmDelete() {
    if (!deletingTransaction) return;
    removeTransaction(deletingTransaction.id);
    toast.success(`Deleted ${deletingTransaction.type} entry`);
    setDeletingTransaction(null);
  }

  return (
    <>
      <div className="flex flex-1 flex-col gap-8 pb-28">
        <header className="flex flex-col gap-1 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <h1 className="text-2xl font-semibold tracking-tight">
            Expense Tracker
          </h1>
          <p className="text-sm text-muted-foreground">
            Track your income and spending at a glance.
          </p>
        </header>

        <div className="flex items-center justify-between gap-3">
          <ViewTabs value={view} onChange={setView} />
          <DateFilters value={filter} onChange={onFilterChange} />
        </div>

        {view === "overview" ? (
          <section className="flex flex-col gap-4">
            <StatCards income={totals.income} expense={totals.expense} />
            <SavingsCard
              savings={lifetimeTotals.balance}
              income={lifetimeTotals.income}
              expense={lifetimeTotals.expense}
            />
            <BalanceOverviewCard
              balance={totals.balance}
              income={totals.income}
              expense={totals.expense}
              data={categoryTotals}
            />
            <TargetSummaryCard
              monthLabel={monthLabel}
              monthKey={currentMonthKey}
              spentByCategoryLabel={spentByCategoryLabel}
              targets={targets}
              customCategories={allCustomCategories}
            />
          </section>
        ) : (
          <TransactionHistory
            transactions={filteredTransactions}
            customCategories={allCustomCategories}
            onEdit={setEditingTransaction}
            onDelete={setDeletingTransaction}
          />
        )}
      </div>

      <EditTransactionDrawer
        transaction={editingTransaction}
        onOpenChange={(open) => {
          if (!open) setEditingTransaction(null);
        }}
        onSave={(id, patch) => {
          const transaction = transactions.find((t) => t.id === id);
          if (!transaction) return;
          setPendingUpdate({ transaction, ...patch });
          setEditingTransaction(null);
        }}
      />

      <ConfirmTransactionActionDialog
        open={pendingUpdate !== null}
        onOpenChange={(open) => {
          if (!open) setPendingUpdate(null);
        }}
        action="update"
        transaction={pendingUpdate?.transaction ?? null}
        nextCategory={pendingUpdate?.category}
        nextAmount={pendingUpdate?.amount}
        customCategories={allCustomCategories}
        onConfirm={handleConfirmUpdate}
      />

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
