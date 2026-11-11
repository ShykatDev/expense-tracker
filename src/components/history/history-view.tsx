"use client";

import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "@yusufceng1z/ding-react";

import { useCategories } from "@/components/categories/categories-provider";
import { ConfirmTransactionActionDialog } from "@/components/dashboard/confirm-transaction-action";
import { HeroFigures } from "@/components/dashboard/dashboard-hero";
import { DateFilters } from "@/components/dashboard/date-filters";
import { useMonthNav } from "@/components/dashboard/navbar";
import { TransactionHistory } from "@/components/dashboard/transaction-history";
import { useTransactions } from "@/components/dashboard/transactions-provider";
import {
  AppHero,
  AppSheet,
  AppShell,
  HeroAmount,
  SheetButton,
  SheetToggle,
} from "@/components/layout/app-shell";
import { TRANSITION } from "@/components/layout/page-transition";
import {
  computeTotals,
  isWithinDateRange,
  type DateRangeFilter,
  type Transaction,
  type TransactionType,
} from "@/lib/transactions";

type TypeFilter = "all" | TransactionType;

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "all" },
  { value: "expense", label: "expenses" },
  { value: "income", label: "income" },
];

/** Rows rendered per "Show more" step, so years of history stay fast. */
const PAGE_SIZE = 50;

/**
 * Every transaction ever recorded, searchable and filterable. The hero
 * totals follow the filters, so it doubles as a quick "how much did I spend
 * on X" calculator.
 */
export function HistoryView() {
  const router = useRouter();
  const { transactions, removeTransaction } = useTransactions();
  const { categories } = useCategories();
  const { monthAnchor } = useMonthNav();

  const [query, setQuery] = React.useState("");
  const [type, setType] = React.useState<TypeFilter>("all");
  const [period, setPeriod] = React.useState<DateRangeFilter>("all");
  const [visible, setVisible] = React.useState(PAGE_SIZE);
  const [deleting, setDeleting] = React.useState<Transaction | null>(null);

  const customCategories = React.useMemo(
    () => [...categories.income, ...categories.expense],
    [categories.income, categories.expense],
  );

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return transactions
      .filter((t) => type === "all" || t.type === type)
      .filter((t) => isWithinDateRange(t.createdAt, period, monthAnchor))
      .filter((t) => !needle || t.category.toLowerCase().includes(needle))
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [transactions, type, period, monthAnchor, query]);

  const totals = React.useMemo(() => computeTotals(filtered), [filtered]);
  const shown = filtered.slice(0, visible);
  const isFiltered = query.trim() !== "" || type !== "all" || period !== "all";

  function resetPaging() {
    setVisible(PAGE_SIZE);
  }

  function handleConfirmDelete() {
    if (!deleting) return;
    removeTransaction(deleting.id);
    toast.success(`Deleted ${deleting.type} entry`);
    setDeleting(null);
  }

  return (
    <AppShell>
      <AppHero
        label={isFiltered ? "Net for this view" : "All-time balance"}
        value={<HeroAmount value={totals.balance} />}
        action={{ label: "Add transaction", onClick: () => router.push("/transaction", { transitionTypes: [...TRANSITION.sheetUp] }) }}
      >
        <p className="text-xs tabular-nums text-white/55">
          {filtered.length} {filtered.length === 1 ? "transaction" : "transactions"}
        </p>
        <HeroFigures income={totals.income} expense={totals.expense} />
      </AppHero>

      <AppSheet className="gap-6">
        {/* Filters */}
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-white/35" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                resetPaging();
              }}
              placeholder="Search by category"
              aria-label="Search transactions"
              className="h-12 w-full rounded-full bg-white/6 pr-11 pl-11 text-sm text-white outline-none placeholder:text-white/35 focus:ring-1 focus:ring-white/20"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setQuery("");
                  resetPaging();
                }}
                className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-white/45 hover:bg-white/10 hover:text-white"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <SheetToggle
              compact
              label="Transaction type"
              value={type}
              options={TYPE_OPTIONS}
              onChange={(next) => {
                setType(next);
                resetPaging();
              }}
            />
            <DateFilters
              compact
              value={period}
              onChange={(next) => {
                setPeriod(next);
                resetPaging();
              }}
            />
          </div>
        </div>

        <TransactionHistory
          transactions={shown}
          customCategories={customCategories}
          onEdit={(transaction) => router.push(`/transaction?edit=${transaction.id}`, { transitionTypes: [...TRANSITION.sheetUp] })}
          onDelete={setDeleting}
          emptyMessage={
            transactions.length === 0
              ? "No transactions yet. Tap + to add your first one."
              : "Nothing matches these filters."
          }
        />

        {filtered.length > visible && (
          <SheetButton
            className="self-center"
            onClick={() => setVisible((count) => count + PAGE_SIZE)}
          >
            Show more ({filtered.length - visible} left)
          </SheetButton>
        )}
      </AppSheet>

      <ConfirmTransactionActionDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        action="delete"
        transaction={deleting}
        customCategories={customCategories}
        onConfirm={handleConfirmDelete}
      />
    </AppShell>
  );
}
