"use client"

import * as React from "react"
import { toast } from "sonner"

import { useTransactions } from "@/hooks/use-transactions"
import {
  computeCategoryTotals,
  computeTotals,
  isWithinDateRange,
  type DateRangeFilter,
  type Transaction,
} from "@/lib/transactions"

import { BalanceOverviewCard } from "./balance-overview-card"
import { BalanceTrend } from "./balance-trend"
import { DateFilters } from "./date-filters"
import { EditTransactionDrawer } from "./edit-transaction-drawer"
import { ExpenseDrawer } from "./expense-drawer"
import { IncomeDrawer } from "./income-drawer"
import { Navbar } from "./navbar"
import { StatCards } from "./stat-cards"
import { TransactionHistory } from "./transaction-history"
import { ViewTabs, type DashboardView } from "./view-tabs"

function startOfMonth(monthOffset: number) {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
}

export function Dashboard() {
  const { transactions, addTransactions, removeTransaction, updateTransaction } =
    useTransactions()
  const [filter, setFilter] = React.useState<DateRangeFilter>("month")
  const [monthOffset, setMonthOffset] = React.useState(0)
  const [view, setView] = React.useState<DashboardView>("overview")
  const [editingTransaction, setEditingTransaction] = React.useState<Transaction | null>(
    null,
  )

  const monthAnchor = React.useMemo(() => startOfMonth(monthOffset), [monthOffset])
  const monthLabel = React.useMemo(
    () =>
      monthAnchor.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
    [monthAnchor],
  )

  const filteredTransactions = React.useMemo(
    () =>
      transactions.filter((t) => isWithinDateRange(t.createdAt, filter, monthAnchor)),
    [transactions, filter, monthAnchor],
  )

  const totals = React.useMemo(
    () => computeTotals(filteredTransactions),
    [filteredTransactions],
  )
  const categoryTotals = React.useMemo(
    () => computeCategoryTotals(filteredTransactions),
    [filteredTransactions],
  )

  const previousMonthAnchor = React.useMemo(
    () => startOfMonth(monthOffset - 1),
    [monthOffset],
  )

  const previousTransactions = React.useMemo(() => {
    if (filter === "all") return []

    if (filter === "month") {
      return transactions.filter((t) =>
        isWithinDateRange(t.createdAt, "month", previousMonthAnchor),
      )
    }

    const now = new Date()

    if (filter === "today") {
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      return transactions.filter(
        (t) => new Date(t.createdAt).toDateString() === yesterday.toDateString(),
      )
    }

    const currentWeekStart = new Date(now)
    currentWeekStart.setHours(0, 0, 0, 0)
    currentWeekStart.setDate(currentWeekStart.getDate() - 6)
    const previousWeekEnd = new Date(currentWeekStart.getTime() - 1)
    const previousWeekStart = new Date(previousWeekEnd)
    previousWeekStart.setHours(0, 0, 0, 0)
    previousWeekStart.setDate(previousWeekStart.getDate() - 6)
    return transactions.filter(
      (t) => t.createdAt >= previousWeekStart.getTime() && t.createdAt <= previousWeekEnd.getTime(),
    )
  }, [transactions, filter, previousMonthAnchor])

  const previousTotals = React.useMemo(
    () => computeTotals(previousTransactions),
    [previousTransactions],
  )

  const balanceChangePercent = React.useMemo(() => {
    if (filter === "all") return null
    const diff = totals.balance - previousTotals.balance
    if (previousTotals.balance !== 0) return (diff / Math.abs(previousTotals.balance)) * 100
    return totals.balance === 0 ? 0 : 100
  }, [filter, totals.balance, previousTotals.balance])

  function handlePrevMonth() {
    setFilter("month")
    setMonthOffset((prev) => prev - 1)
  }

  function handleNextMonth() {
    setFilter("month")
    setMonthOffset((prev) => prev + 1)
  }

  return (
    <>
      <div className="flex flex-1 flex-col gap-8 py-6 pb-28">
        <Navbar
          monthLabel={monthLabel}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
        />

        <header className="flex flex-col gap-1 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <h1 className="text-2xl font-semibold tracking-tight">Expense Tracker</h1>
          <p className="text-sm text-muted-foreground">
            Track your income and spending at a glance.
          </p>
        </header>

        <div className="flex items-center justify-between gap-3">
          <ViewTabs value={view} onChange={setView} />
          <DateFilters value={filter} onChange={setFilter} />
        </div>

        {view === "overview" ? (
          <section className="flex flex-col gap-4">
            <StatCards income={totals.income} expense={totals.expense} />
            <BalanceOverviewCard
              balance={totals.balance}
              income={totals.income}
              expense={totals.expense}
              data={categoryTotals}
            />
          </section>
        ) : (
          <TransactionHistory
            transactions={filteredTransactions}
            onEdit={setEditingTransaction}
            onDelete={(transaction) => {
              removeTransaction(transaction.id)
              toast.success(`Deleted ${transaction.type} entry`)
            }}
          />
        )}
      </div>

      <EditTransactionDrawer
        transaction={editingTransaction}
        onOpenChange={(open) => {
          if (!open) setEditingTransaction(null)
        }}
        onSave={updateTransaction}
      />

      <div className="fixed inset-x-0 bottom-0 z-30 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-8 md:px-16 lg:px-24 xl:px-32 2xl:px-48">
        <section className="solid-panel mx-auto flex max-w-xl items-center gap-3 rounded-2xl border border-white/10 p-3 shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset,0_8px_30px_-8px_rgba(0,0,0,0.6)]">
          <BalanceTrend balance={totals.balance} changePercent={balanceChangePercent} />
          <div className="flex shrink-0 gap-2">
            <IncomeDrawer
              onSubmit={(entries) =>
                addTransactions(entries.map((entry) => ({ ...entry, type: "income" })))
              }
            />
            <ExpenseDrawer
              onSubmit={(entries) =>
                addTransactions(entries.map((entry) => ({ ...entry, type: "expense" })))
              }
            />
          </div>
        </section>
      </div>
    </>
  )
}
