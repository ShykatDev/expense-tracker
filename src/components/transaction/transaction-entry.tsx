"use client";

import { Check, Delete, Plus, RotateCcw, StickyNote, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "@yusufceng1z/ding-react";

import { useAccounts } from "@/components/accounts/accounts-provider";
import { useCategories } from "@/components/categories/categories-provider";
import { useTransactions } from "@/components/dashboard/transactions-provider";
import { useTargets } from "@/components/targets/targets-provider";
import { SheetToggle } from "@/components/layout/app-shell";
import { AccountSheet } from "@/components/transaction/account-sheet";
import { CategorySheet } from "@/components/transaction/category-sheet";
import { DateStrip } from "@/components/transaction/date-strip";
import { applyKey, NumericKeypad } from "@/components/transaction/numeric-keypad";
import {
  applySavedTransaction,
  findBudgetCrossings,
  formatBudgetCrossing,
} from "@/lib/budget-alerts";
import { AccountIcon } from "@/components/accounts/account-icon";
import { DEFAULT_ACCOUNT_ID, MAX_NOTE_LENGTH } from "@/lib/accounts";
import { resolveCategories } from "@/lib/categories";
import { getCategoryIconByKey } from "@/lib/category-icons";
import {
  formatCurrency,
  OTHER_CATEGORY_LABEL,
  type Transaction,
  type TransactionType,
} from "@/lib/transactions";
import { cn } from "@/lib/utils";

/** How many "add again" chips to offer. */
const QUICK_PICK_COUNT = 4;

/** The small secondary chips under the category (account, note, quick picks). */
const SMALL_CHIP_CLASS =
  "flex h-8 max-w-full min-w-0 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] transition-colors active:scale-95";

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
 * The most recent distinct category + amount pairs of one type, newest first.
 * The list is kept in insertion order (new entries are prepended), so this
 * follows what was *entered* recently, not backdated dates.
 */
function getQuickPicks(transactions: Transaction[], type: TransactionType) {
  const seen = new Set<string>();
  const picks: Transaction[] = [];
  for (const t of transactions) {
    if (t.type !== type) continue;
    const key = `${t.category}\u0000${t.amount}`;
    if (seen.has(key)) continue;
    seen.add(key);
    picks.push(t);
    if (picks.length === QUICK_PICK_COUNT) break;
  }
  return picks;
}

/**
 * The transaction entry screen: a white, keypad-first page.
 *
 * The amount is the focus. The category is shown as a pair of black chips
 * (icon + name) beneath it, and tapping them opens a picker sheet. Smaller
 * chips below add a note and, for people with more than one account, pick
 * the account. The tick on the keypad saves the entry and returns to the
 * dashboard.
 */
export function TransactionEntry() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { categories, hidden } = useCategories();
  const { targets } = useTargets();
  const { transactions, addTransactions, updateTransaction } = useTransactions();
  const {
    accounts,
    balances,
    hasMultipleAccounts,
    getAccount,
    defaultEntryAccountId,
    setLastAccountId,
  } = useAccounts();

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
  const [note, setNote] = React.useState("");
  const [noteOpen, setNoteOpen] = React.useState(false);
  /** Null until the user (or the edited entry) picks one; then the default applies. */
  const [accountChoice, setAccountChoice] = React.useState<string | null>(null);
  const [accountSheetOpen, setAccountSheetOpen] = React.useState(false);

  // Accounts load from storage after hydration, so the default is resolved
  // at render time rather than copied into state once.
  const accountId =
    accountChoice && accounts.some((a) => a.id === accountChoice)
      ? accountChoice
      : defaultEntryAccountId;
  const account = getAccount(accountId);

  // Transactions load from storage after the first render, so the edited
  // entry's values are copied in once it appears rather than at mount.
  const [loadedEditId, setLoadedEditId] = React.useState<string | null>(null);
  if (editing && loadedEditId !== editing.id) {
    setLoadedEditId(editing.id);
    setType(editing.type);
    setAmount(String(editing.amount));
    setCategoryLabel(editing.category);
    setDate(startOfDay(editing.createdAt));
    setNote(editing.note ?? "");
    setAccountChoice(editing.accountId ?? DEFAULT_ACCOUNT_ID);
  }

  // Re-adding is for new entries only; while an edit loads, show nothing.
  const quickPicks = React.useMemo(
    () => (editId ? [] : getQuickPicks(transactions, type)),
    [editId, transactions, type],
  );

  /** Fills the form from a past entry; the user still confirms with ✓. */
  function applyQuickPick(pick: Transaction) {
    setAmount(String(pick.amount));
    setCategoryLabel(pick.category);
    if (pick.accountId && accounts.some((a) => a.id === pick.accountId)) {
      setAccountChoice(pick.accountId);
    } else if (!pick.accountId) {
      setAccountChoice(DEFAULT_ACCOUNT_ID);
    }
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

    let saved: Transaction | undefined;
    if (editing) {
      const patch = {
        type,
        category,
        amount: numericAmount,
        createdAt: withTimeOf(date, editing.createdAt),
        note,
        accountId,
      };
      updateTransaction(editing.id, patch);
      saved = { ...editing, ...patch };
      toast.success("Entry updated");
    } else {
      [saved] = addTransactions([
        {
          type,
          category,
          amount: numericAmount,
          createdAt: withTimeOf(date, Date.now()),
          note,
          accountId,
        },
      ]);
      // The next entry starts on the same account, which is usually right.
      if (hasMultipleAccounts) setLastAccountId(accountId);
      toast.success(`Added ${type === "income" ? "income" : "expense"}`);
    }

    // Warn when this save pushed a category past 80% or 100% of its
    // monthly target. `transactions` is still the list from before the save.
    if (saved) {
      const crossings = findBudgetCrossings({
        before: transactions,
        after: applySavedTransaction(transactions, saved),
        targets,
        customCategories: [...categories.income, ...categories.expense],
      });
      for (const crossing of crossings) {
        const show = crossing.threshold === 100 ? toast.error : toast.warning;
        // Error toasts stay until dismissed by default; let this one go.
        show(formatBudgetCrossing(crossing), { duration: 6000 });
      }
    }

    router.push("/");
  }

  // A hardware keyboard works too, which matters on desktop.
  const confirmRef = React.useRef(handleConfirm);
  React.useEffect(() => {
    confirmRef.current = handleConfirm;
  });
  React.useEffect(() => {
    if (sheetOpen || accountSheetOpen) return;
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
  }, [sheetOpen, accountSheetOpen]);

  const { typed, implied } = splitAmount(amount);
  const amountLength = typed.length + implied.length;

  return (
    <div
      data-transaction-entry
      className="reveal-target mx-auto flex min-h-dvh w-full flex-col bg-white md:max-w-[430px] text-neutral-900"
    >
      {/* Type toggle, with a quiet way out on the left. */}
      <header className="relative flex items-center justify-center px-5 pt-[max(1.75rem,calc(env(safe-area-inset-top)+1.25rem))]">
        <button
          type="button"
          aria-label="Close"
          onClick={() => router.push("/")}
          className="absolute left-4 flex size-10 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
        >
          <X className="size-5" strokeWidth={1.75} />
        </button>

        <SheetToggle
          tone="light"
          label="Transaction type"
          value={type}
          onChange={handleTypeChange}
          options={TYPE_OPTIONS}
        />
      </header>

      <div className="px-3 pt-6">
        <DateStrip value={date} onChange={setDate} />
      </div>

      {/* Amount and category */}
      <section className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-5">
        <div className="relative flex w-full items-center justify-center">
          <p
            aria-live="polite"
            aria-label={`Amount ${amount || "0"}`}
            className={cn(
              "font-display font-normal tracking-tight tabular-nums whitespace-nowrap transition-[font-size] duration-150",
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

        {/* Account and note: quiet chips, so the keypad stays the focus. */}
        {noteOpen ? (
          <form
            className="flex w-full max-w-xs items-center gap-1.5"
            onSubmit={(event) => {
              event.preventDefault();
              setNoteOpen(false);
            }}
          >
            <input
              autoFocus
              value={note}
              maxLength={MAX_NOTE_LENGTH}
              onChange={(event) => setNote(event.target.value)}
              onBlur={() => setNoteOpen(false)}
              placeholder="add a note"
              aria-label="Note"
              enterKeyHint="done"
              className="h-9 min-w-0 flex-1 rounded-full bg-neutral-100 px-4 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:ring-2 focus:ring-black/10"
            />
            <button
              type="submit"
              aria-label="Done"
              // Keep focus so the tap lands before the blur closes the field.
              onMouseDown={(event) => event.preventDefault()}
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-black text-white"
            >
              <Check className="size-4" />
            </button>
          </form>
        ) : (
          <div className="flex max-w-full items-center justify-center gap-2">
            {hasMultipleAccounts && (
              <button
                type="button"
                onClick={() => setAccountSheetOpen(true)}
                aria-label={`Account: ${account.name}. Change`}
                className={cn(SMALL_CHIP_CLASS, "bg-neutral-100 text-neutral-700 hover:bg-neutral-200/70")}
              >
                <AccountIcon account={account} className="size-5" iconClassName="size-3.5 shrink-0" />
                <span className="truncate">{account.name}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setNoteOpen(true)}
              aria-label={note.trim() ? `Note: ${note.trim()}. Edit` : "Add a note"}
              className={cn(
                SMALL_CHIP_CLASS,
                note.trim()
                  ? "bg-neutral-100 text-neutral-900 hover:bg-neutral-200/70"
                  : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700",
              )}
            >
              <StickyNote className="size-3.5 shrink-0" />
              <span className="max-w-44 truncate">{note.trim() || "add note"}</span>
            </button>
          </div>
        )}
      </section>

      {/* Recent category + amount pairs: one tap fills the form. */}
      {quickPicks.length > 0 && (
        <div
          className="overflow-x-auto px-5 pb-3.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="group"
          aria-label="Add again"
        >
          <div className="mx-auto flex w-max gap-2">
            {quickPicks.map((pick) => {
              const active =
                pick.category === categoryLabel && String(pick.amount) === amount;
              return (
                <button
                  key={pick.id}
                  type="button"
                  onClick={() => applyQuickPick(pick)}
                  aria-pressed={active}
                  aria-label={`Fill in ${pick.category} ${formatCurrency(pick.amount)}`}
                  className={cn(
                    SMALL_CHIP_CLASS,
                    active
                      ? "bg-black text-white"
                      : "border border-neutral-200 text-neutral-700 hover:bg-neutral-100",
                  )}
                >
                  <RotateCcw className="size-3 shrink-0 opacity-60" />
                  <span className="max-w-28 truncate lowercase">{pick.category}</span>
                  <span className="tabular-nums">{formatCurrency(pick.amount)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

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

      {hasMultipleAccounts && (
        <AccountSheet
          open={accountSheetOpen}
          onOpenChange={setAccountSheetOpen}
          accounts={accounts}
          balances={balances}
          selectedId={accountId}
          onSelect={(id) => {
            setAccountChoice(id);
            setAccountSheetOpen(false);
          }}
        />
      )}
    </div>
  );
}
