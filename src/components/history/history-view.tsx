"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { useAccounts } from "@/components/accounts/accounts-provider";
import { useCategories } from "@/components/categories/categories-provider";
import { useDeleteTransaction } from "@/components/dashboard/use-delete-transaction";
import { HeroFigures } from "@/components/dashboard/dashboard-hero";
import { DateFilters } from "@/components/dashboard/date-filters";
import { useMonthNav } from "@/components/dashboard/navbar";
import { TransactionHistory } from "@/components/dashboard/transaction-history";
import { useTransactions } from "@/components/dashboard/transactions-provider";
import { ExpandableSheet } from "@/components/layout/expandable-sheet";
import {
  AppHero,
  HeroAmount,
  SheetButton,
  SheetToggle,
} from "@/components/layout/app-shell";
import {
  computeTotals,
  isWithinDateRange,
  type DateRangeFilter,
  type TransactionType,
} from "@/lib/transactions";
import { formatAmount, sanitizeAmount } from "@/components/ui/amount-input";
import { resolveAccountId } from "@/lib/accounts";
import { cn } from "@/lib/utils";

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
  const { transactions } = useTransactions();
  const deleteTransaction = useDeleteTransaction();
  const { categories } = useCategories();
  const { monthAnchor } = useMonthNav();

  const [query, setQuery] = React.useState("");
  const [type, setType] = React.useState<TypeFilter>("all");
  const [period, setPeriod] = React.useState<DateRangeFilter>("all");
  const [visible, setVisible] = React.useState(PAGE_SIZE);
  const { accounts, hasMultipleAccounts } = useAccounts();
  /** The extra filters, behind the Filters button. */
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [accountId, setAccountId] = React.useState<string | null>(null);
  const [category, setCategory] = React.useState<string | null>(null);
  const [minAmount, setMinAmount] = React.useState("");
  const [maxAmount, setMaxAmount] = React.useState("");

  const customCategories = React.useMemo(
    () => [...categories.income, ...categories.expense],
    [categories.income, categories.expense],
  );

  // Categories that actually have entries (of the chosen type), for the chips.
  const categoryOptions = React.useMemo(
    () =>
      [
        ...new Set(
          transactions
            .filter((t) => type === "all" || t.type === type)
            .map((t) => t.category),
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [transactions, type],
  );

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    // "1,200" or "350" also finds amounts.
    const amountNeedle = needle.replace(/[,৳\s]/g, "");
    const searchesAmount = /^\d+(\.\d*)?$/.test(amountNeedle);
    const min = minAmount ? Number(minAmount) : null;
    const max = maxAmount ? Number(maxAmount) : null;
    return transactions
      .filter((t) => type === "all" || t.type === type)
      .filter((t) => isWithinDateRange(t.createdAt, period, monthAnchor))
      .filter((t) => !accountId || resolveAccountId(t.accountId) === accountId)
      .filter((t) => !category || t.category === category)
      .filter(
        (t) =>
          (min === null || t.amount >= min) &&
          (max === null || t.amount <= max),
      )
      .filter(
        (t) =>
          !needle ||
          t.category.toLowerCase().includes(needle) ||
          (t.note?.toLowerCase().includes(needle) ?? false) ||
          (searchesAmount && String(t.amount).includes(amountNeedle)),
      )
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [
    transactions,
    type,
    period,
    monthAnchor,
    query,
    accountId,
    category,
    minAmount,
    maxAmount,
  ]);

  /** How many of the extra filters are on, for the badge. */
  const extraFilters =
    (accountId ? 1 : 0) + (category ? 1 : 0) + (minAmount || maxAmount ? 1 : 0);

  function clearExtraFilters() {
    setAccountId(null);
    setCategory(null);
    setMinAmount("");
    setMaxAmount("");
    resetPaging();
  }

  const totals = React.useMemo(() => computeTotals(filtered), [filtered]);
  const shown = filtered.slice(0, visible);
  const isFiltered =
    query.trim() !== "" ||
    type !== "all" ||
    period !== "all" ||
    extraFilters > 0;

  function resetPaging() {
    setVisible(PAGE_SIZE);
  }

  return (
    <>
      <ExpandableSheet
        hint="Swipe up for all transactions"
        previewDetails
        hero={
          <AppHero
            label={isFiltered ? "Net for this view" : "All-time balance"}
            value={<HeroAmount value={totals.balance} />}
            action={{
              label: "Add transaction",
              onClick: () => router.push("/transaction"),
            }}
          >
            <p className="text-xs tabular-nums text-white/55">
              {filtered.length}{" "}
              {filtered.length === 1 ? "transaction" : "transactions"}
            </p>
            <HeroFigures income={totals.income} expense={totals.expense} />
          </AppHero>
        }
        peek={() => (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-white/50" />
                <input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    resetPaging();
                  }}
                  placeholder="Search category, note or amount"
                  aria-label="Search transactions"
                  className="h-12 w-full rounded-full bg-white/6 pr-11 pl-11 text-sm text-white outline-none placeholder:text-white/50 focus:ring-1 focus:ring-white/20"
                />
                {query && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => {
                      setQuery("");
                      resetPaging();
                    }}
                    className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setFiltersOpen((prev) => !prev)}
                aria-expanded={filtersOpen}
                aria-label={
                  extraFilters ? `Filters (${extraFilters} on)` : "Filters"
                }
                className={cn(
                  "relative flex size-12 shrink-0 items-center justify-center rounded-full transition-colors active:scale-95",
                  filtersOpen
                    ? "bg-white text-black"
                    : "bg-white/6 text-white/75 hover:bg-white/10",
                )}
              >
                <SlidersHorizontal className="size-4" />
                {extraFilters > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-[#7fa3ec] text-[10px] font-semibold text-[#0a1f52] ring-2 ring-[#141518]">
                    {extraFilters}
                  </span>
                )}
              </button>
            </div>

            {filtersOpen && (
              <div className="flex flex-col gap-4 rounded-3xl bg-white/6 p-4">
                {hasMultipleAccounts && (
                  <FilterGroup label="Account">
                    <FilterChip
                      active={accountId === null}
                      onClick={() => {
                        setAccountId(null);
                        resetPaging();
                      }}
                    >
                      All
                    </FilterChip>
                    {accounts.map((account) => (
                      <FilterChip
                        key={account.id}
                        active={accountId === account.id}
                        onClick={() => {
                          setAccountId(account.id);
                          resetPaging();
                        }}
                      >
                        {account.name}
                      </FilterChip>
                    ))}
                  </FilterGroup>
                )}

                {categoryOptions.length > 0 && (
                  <FilterGroup label="Category">
                    <FilterChip
                      active={category === null}
                      onClick={() => {
                        setCategory(null);
                        resetPaging();
                      }}
                    >
                      All
                    </FilterChip>
                    {categoryOptions.map((label) => (
                      <FilterChip
                        key={label}
                        active={category === label}
                        onClick={() => {
                          setCategory(label);
                          resetPaging();
                        }}
                      >
                        {label}
                      </FilterChip>
                    ))}
                  </FilterGroup>
                )}

                <div className="flex flex-col gap-2">
                  <p className="px-1 text-xs font-medium text-white/55">
                    Amount
                  </p>
                  <div className="flex items-center gap-2">
                    <AmountField
                      label="Minimum amount"
                      placeholder="Min"
                      value={minAmount}
                      onChange={(v) => {
                        setMinAmount(v);
                        resetPaging();
                      }}
                    />
                    <span className="text-white/40">–</span>
                    <AmountField
                      label="Maximum amount"
                      placeholder="Max"
                      value={maxAmount}
                      onChange={(v) => {
                        setMaxAmount(v);
                        resetPaging();
                      }}
                    />
                  </div>
                </div>

                {extraFilters > 0 && (
                  <button
                    type="button"
                    onClick={clearExtraFilters}
                    className="self-start rounded-full px-3 py-1.5 text-xs text-white/60 ring-1 ring-white/12 transition-colors hover:bg-white/6 hover:text-white"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            )}

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
        )}
        details={
          <>
            <TransactionHistory
              transactions={shown}
              customCategories={customCategories}
              onEdit={(transaction) =>
                router.push(`/transaction?edit=${transaction.id}`)
              }
              onDelete={deleteTransaction}
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
          </>
        }
      />
    </>
  );
}

/** A labelled row of filter chips that scrolls sideways when it's long. */
function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="px-1 text-xs font-medium text-white/55">{label}</p>
      <div className="-mx-4 overflow-x-auto px-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-1.5">{children}</div>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-8 max-w-44 truncate rounded-full px-3.5 text-[13px] transition-colors active:scale-95",
        active
          ? "bg-white text-black"
          : "bg-white/8 text-white/75 hover:bg-white/12",
      )}
    >
      {children}
    </button>
  );
}

/** A small ৳ amount box for the range filter, with the phone's number pad. */
function AmountField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (raw: string) => void;
}) {
  return (
    <label className="flex h-10 min-w-0 flex-1 items-center gap-1 rounded-full bg-white/8 px-3.5 text-sm tabular-nums focus-within:ring-1 focus-within:ring-white/25">
      <span className="text-white/40">৳</span>
      <input
        type="text"
        inputMode="decimal"
        aria-label={label}
        placeholder={placeholder}
        value={formatAmount(value)}
        onChange={(event) => onChange(sanitizeAmount(event.target.value))}
        className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-white/35"
      />
    </label>
  );
}
