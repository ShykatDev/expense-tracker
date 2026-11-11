"use client";

import { ArrowDownRight, ArrowUpRight, Pencil, Trash2 } from "lucide-react";
import * as React from "react";
import { createElement } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { resolveCategoryIcon } from "@/lib/categories";
import {
  formatCurrency,
  groupTransactionsByDay,
  type CustomCategory,
  type Transaction,
} from "@/lib/transactions";
import { cn } from "@/lib/utils";

/**
 * Older entries were saved at midnight with no real time, so a 12:00 AM
 * timestamp is treated as "no time" rather than shown.
 */
function formatTime(createdAt: number) {
  const date = new Date(createdAt);
  if (date.getHours() === 0 && date.getMinutes() === 0) return null;
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** Renders a transaction's category icon; resolved by label at render time. */
function CategoryIcon({
  transaction,
  customCategories,
  className,
}: {
  transaction: Transaction;
  customCategories: CustomCategory[];
  className?: string;
}) {
  return createElement(
    resolveCategoryIcon(transaction.type, transaction.category, customCategories),
    { className },
  );
}

/**
 * Transactions grouped by day. Each row is one tap target that opens a small
 * sheet with the details and the edit / delete actions, so the list itself
 * stays as clean as the rest of the dashboard.
 */
export function TransactionHistory({
  transactions,
  customCategories = [],
  onEdit,
  onDelete,
  emptyMessage = "No entries for this period yet.",
}: {
  transactions: Transaction[];
  customCategories?: CustomCategory[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  emptyMessage?: string;
}) {
  const [selected, setSelected] = React.useState<Transaction | null>(null);
  const groups = groupTransactionsByDay(transactions);

  if (groups.length === 0) {
    return (
      <Card className="items-center justify-center px-6 py-10 text-center text-sm text-white/40">
        {emptyMessage}
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => {
        const net = group.items.reduce(
          (sum, t) => sum + (t.type === "income" ? t.amount : -t.amount),
          0,
        );
        return (
          <div key={group.label} className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1 text-xs">
              <span className="font-medium text-white/45">{group.label}</span>
              <span className="tabular-nums text-white/30">
                {net >= 0 ? "+" : "−"}
                {formatCurrency(Math.abs(net))}
              </span>
            </div>
            <Card className="gap-0 py-1.5">
              {group.items.map((transaction) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  customCategories={customCategories}
                  onSelect={() => setSelected(transaction)}
                />
              ))}
            </Card>
          </div>
        );
      })}

      <TransactionSheet
        transaction={selected}
        customCategories={customCategories}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        onEdit={(transaction) => {
          setSelected(null);
          onEdit(transaction);
        }}
        onDelete={(transaction) => {
          setSelected(null);
          onDelete(transaction);
        }}
      />
    </div>
  );
}

function TransactionRow({
  transaction,
  customCategories,
  onSelect,
}: {
  transaction: Transaction;
  customCategories: CustomCategory[];
  onSelect: () => void;
}) {
  const isIncome = transaction.type === "income";
  const time = formatTime(transaction.createdAt);

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/4 active:bg-white/6"
      aria-label={`${transaction.category}, ${isIncome ? "income" : "expense"} ${formatCurrency(transaction.amount)}. Show actions`}
    >
      <span
        className={cn(
          "relative flex size-10 shrink-0 items-center justify-center rounded-full",
          "bg-white/8", isIncome ? "text-emerald-300" : "text-rose-300",
        )}
      >
        <CategoryIcon
          transaction={transaction}
          customCategories={customCategories}
          className="size-4"
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-white">{transaction.category}</span>
        <span className="block text-xs text-white/40">
          {isIncome ? "Income" : "Expense"}
          {time && ` · ${time}`}
        </span>
      </span>
      <span
        className={cn(
          "shrink-0 text-sm font-medium tabular-nums",
          "text-white",
        )}
      >
        {isIncome ? "+" : "−"}
        {formatCurrency(transaction.amount)}
      </span>
    </button>
  );
}

function TransactionSheet({
  transaction,
  customCategories,
  onOpenChange,
  onEdit,
  onDelete,
}: {
  transaction: Transaction | null;
  customCategories: CustomCategory[];
  onOpenChange: (open: boolean) => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}) {
  // Keep the last transaction around while the sheet animates closed.
  const [shown, setShown] = React.useState(transaction);
  if (transaction && transaction !== shown) setShown(transaction);

  const isIncome = shown?.type === "income";
  const TypeIcon = isIncome ? ArrowUpRight : ArrowDownRight;

  return (
    <Dialog open={transaction !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        {shown && (
          <>
            <DialogHeader className="items-center pr-0 pt-2 text-center">
              <span
                className={cn(
                  "flex size-14 items-center justify-center rounded-full",
                  "bg-white/8", isIncome ? "text-emerald-300" : "text-rose-300",
                )}
              >
                <CategoryIcon
                  transaction={shown}
                  customCategories={customCategories}
                  className="size-6"
                />
              </span>
              <DialogTitle className="mt-2 text-3xl font-bold tabular-nums">
                {isIncome ? "+" : "−"}
                {formatCurrency(shown.amount)}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-1.5">
                <TypeIcon className="size-3.5" />
                {shown.category} ·{" "}
                {new Date(shown.createdAt).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
                {formatTime(shown.createdAt) && ` · ${formatTime(shown.createdAt)}`}
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <Button size="lg" onClick={() => onEdit(shown)}>
                <Pencil />
                Edit
              </Button>
              <Button variant="destructive" size="lg" onClick={() => onDelete(shown)}>
                <Trash2 />
                Delete
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
