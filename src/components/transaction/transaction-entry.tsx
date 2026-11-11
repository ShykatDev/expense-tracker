"use client";

import { Delete, Plus, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { useCategories } from "@/components/categories/categories-provider";
import { useTransactions } from "@/components/dashboard/transactions-provider";
import { CategorySheet } from "@/components/transaction/category-sheet";
import { DateStrip } from "@/components/transaction/date-strip";
import { applyKey, NumericKeypad } from "@/components/transaction/numeric-keypad";
import { resolveCategories } from "@/lib/categories";
import { getCategoryIconByKey } from "@/lib/category-icons";
import { OTHER_CATEGORY_LABEL, type TransactionType } from "@/lib/transactions";
import { cn } from "@/lib/utils";

/** Shown for a custom category name that has no icon of its own. */
const FallbackIcon = getCategoryIconByKey(null);

const TYPE_OPTIONS: { value: TransactionType; label: string }[] = [
  { value: "expense", label: "expenses" },
  { value: "income", label: "income" },
];

function startOfDay(time: number) {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** Puts the time of day from `timeSource` onto the calendar day of `day`. */
function withTimeOf(day: number, timeSource: number) {
  return day + (timeSource - startOfDay(timeSource));
}

/**
 * Splits the raw amount into the part the user typed and the part implied to
 * complete two decimals, so "20" renders as "20" + a faint ".00".
 */
function splitAmount(raw: string) {
  if (raw === "") return { typed: "", implied: "0.00" };
  const [whole, fraction] = raw.split(".");
  const typedWhole = Number(whole).toLocaleString("en-US");
  if (fraction === undefined) return { typed: typedWhole, implied: ".00" };
  return {
    typed: `${typedWhole}.${fraction}`,
    implied: "0".repeat(2 - fraction.length),
  };
}

/**
 * The transaction entry screen: a white, keypad-first page.
 *
 * The amount is the focus. The category is shown as a pair of black chips
 * (icon + name) beneath it, and tapping them opens a picker sheet. The tick
 * on the keypad saves the entry and returns to the dashboard.
 */
export function TransactionEntry() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { categories, hidden } = useCategories();
  const { transactions, addTransactions, updateTransaction } = useTransactions();

  const editId = searchParams.get("edit");
  const initialType: TransactionType =
    searchParams.get("type") === "income" ? "income" : "expense";

  const editing = React.useMemo(
    () => (editId ? (transactions.find((t) => t.id === editId) ?? null) : null),
    [transactions, editId],
  );

  const [type, setType] = React.useState<TransactionType>(initialType);
  const [amount, setAmount] = React.useState("");
  const [categoryLabel, setCategoryLabel] = React.useState<string | null>(null);
  const [date, setDate] = React.useState(() => startOfDay(Date.now()));
  const [sheetOpen, setSheetOpen] = React.useState(false);

  // Transactions load from storage after the first render, so the edited
  // entry's values are copied in once it appears rather than at mount.
  const [loadedEditId, setLoadedEditId] = React.useState<string | null>(null);
  if (editing && loadedEditId !== editing.id) {
    setLoadedEditId(editing.id);
    setType(editing.type);
    setAmount(String(editing.amount));
    setCategoryLabel(editing.category);
    setDate(startOfDay(editing.createdAt));
  }

  const visibleCategories = React.useMemo(
    () =>
      resolveCategories(type, categories[type]).filter(
        (c) => !hidden[type].includes(c.key),
      ),
    [categories, hidden, type],
  );

  // The selection is stored as a label (that is what a transaction keeps), so
  // a custom name with no matching chip still gets a generic icon.
  const selectedCategory = visibleCategories.find((c) => c.label === categoryLabel);
  const CategoryIcon = selectedCategory?.icon ?? FallbackIcon;

  const numericAmount = Number(amount);
  const amountValid = amount !== "" && Number.isFinite(numericAmount) && numericAmount > 0;

  function handleTypeChange(next: TransactionType) {
    if (next === type) return;
    // Categories are type specific, so the current pick no longer applies.
    setType(next);
    setCategoryLabel(null);
  }

  function handleConfirm() {
    if (!amountValid) {
      toast.error("Enter an amount");
      return;
    }

    const category = categoryLabel ?? OTHER_CATEGORY_LABEL;

    if (editing) {
      updateTransaction(editing.id, {
        type,
        category,
        amount: numericAmount,
        createdAt: withTimeOf(date, editing.createdAt),
      });
      toast.success("Entry updated");
    } else {
      addTransactions([
        {
          type,
          category,
          amount: numericAmount,
          createdAt: withTimeOf(date, Date.now()),
        },
      ]);
      toast.success(`Added ${type === "income" ? "income" : "expense"}`);
    }

    router.push("/");
  }

  // A hardware keyboard works too, which matters on desktop.
  const confirmRef = React.useRef(handleConfirm);
  React.useEffect(() => {
    confirmRef.current = handleConfirm;
  });
  React.useEffect(() => {
    if (sheetOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea")) return;

      if (/^[0-9.]$/.test(event.key)) {
        setAmount((prev) => applyKey(prev, event.key));
      } else if (event.key === "Backspace") {
        setAmount((prev) => prev.slice(0, -1));
      } else if (event.key === "Enter") {
        event.preventDefault();
        confirmRef.current();
      } else {
        return;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sheetOpen]);

  const { typed, implied } = splitAmount(amount);
  const amountLength = typed.length + implied.length;

  return (
    <div
      data-transaction-entry
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-white text-neutral-900"
    >
      {/* Type toggle, with a quiet way out on the left. */}
      <header className="relative flex items-center justify-center px-5 pt-[max(1.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          aria-label="Close"
          onClick={() => router.push("/")}
          className="absolute left-4 flex size-10 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
        >
          <X className="size-5" strokeWidth={1.75} />
        </button>

        <div className="flex items-center gap-1" role="group" aria-label="Transaction type">
          {TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleTypeChange(option.value)}
              aria-pressed={type === option.value}
              className={cn(
                "rounded-full border-[1.5px] px-4 py-1.5 text-[15px] transition-colors duration-200",
                type === option.value
                  ? "border-neutral-900 text-neutral-900"
                  : "border-transparent text-neutral-900 hover:text-neutral-500",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>

      <div className="px-3 pt-8">
        <DateStrip value={date} onChange={setDate} />
      </div>

      {/* Amount and category */}
      <section className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-8">
        <div className="relative flex w-full items-center justify-center">
          <p
            aria-live="polite"
            aria-label={`Amount ${amount || "0"}`}
            className={cn(
              "font-normal tracking-tight tabular-nums whitespace-nowrap transition-[font-size] duration-150",
              amountLength > 11 ? "text-4xl" : amountLength > 8 ? "text-5xl" : "text-[3.25rem]",
            )}
          >
            <span className={amount ? "text-neutral-900" : "text-neutral-300"}>৳</span>
            <span>{typed}</span>
            <span className="text-neutral-300">{implied}</span>
          </p>

          {amount && (
            <button
              type="button"
              aria-label="Delete last digit"
              onClick={() => setAmount((prev) => prev.slice(0, -1))}
              className="absolute right-0 flex size-10 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900 active:scale-90"
            >
              <Delete className="size-5" strokeWidth={1.75} />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex items-center gap-1.5 transition-transform active:scale-95"
          aria-label={
            categoryLabel ? `Category: ${categoryLabel}. Change` : "Choose a category"
          }
        >
          <span
            className={cn(
              "flex size-10 items-center justify-center rounded-full",
              categoryLabel ? "bg-black text-white" : "bg-neutral-100 text-neutral-500",
            )}
          >
            {categoryLabel ? (
              <CategoryIcon className="size-4" />
            ) : (
              <Plus className="size-4" />
            )}
          </span>
          <span
            className={cn(
              "flex h-10 max-w-60 items-center truncate rounded-full px-4 text-[15px] lowercase",
              categoryLabel ? "bg-black text-white" : "bg-neutral-100 text-neutral-500",
            )}
          >
            {categoryLabel ?? (type === "expense" ? "category" : "source")}
          </span>
        </button>
      </section>

      <div className="px-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <NumericKeypad value={amount} onChange={setAmount} onConfirm={handleConfirm} />
      </div>

      <CategorySheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={type === "expense" ? "category" : "source"}
        categories={visibleCategories}
        selectedLabel={categoryLabel}
        onSelect={(label) => {
          setCategoryLabel(label);
          setSheetOpen(false);
        }}
      />
    </div>
  );
}
