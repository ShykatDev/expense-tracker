"use client";

import { Check, Trash2 } from "lucide-react";
import { createElement } from "react";

import { Button } from "@/components/ui/button";
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
  type CustomCategory,
  type Transaction,
  type TransactionType,
} from "@/lib/transactions";

function CategoryIcon({
  type,
  label,
  customCategories,
}: {
  type: TransactionType;
  label: string;
  customCategories: CustomCategory[];
}) {
  const Icon = resolveCategoryIcon(type, label, customCategories);
  return createElement(Icon, { className: "size-5 text-foreground" });
}

export function ConfirmTransactionActionDialog({
  open,
  onOpenChange,
  action,
  transaction,
  nextCategory,
  nextAmount,
  customCategories = [],
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: "update" | "delete";
  transaction: Transaction | null;
  nextCategory?: string;
  nextAmount?: number;
  customCategories?: CustomCategory[];
  onConfirm: () => void;
}) {
  const isDelete = action === "delete";

  const label =
    transaction && !isDelete
      ? (nextCategory ?? transaction.category)
      : (transaction?.category ?? "");
  const amount =
    transaction && !isDelete
      ? (nextAmount ?? transaction.amount)
      : (transaction?.amount ?? 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isDelete ? "Delete entry?" : "Update entry?"}
          </DialogTitle>
          <DialogDescription>
            {isDelete
              ? "This entry will be permanently removed from your history."
              : "Review the changes before saving this entry."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 rounded-3xl bg-white/6 p-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/8">
            {transaction && (
              <CategoryIcon
                type={transaction.type}
                label={label}
                customCategories={customCategories}
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {label}
            </p>
            <p className="text-xs text-muted-foreground">
              {transaction?.type === "income" ? "Income" : "Expense"}
            </p>
          </div>
          <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
            {transaction?.type === "income" ? "+" : "−"}
            {formatCurrency(amount)}
          </span>
        </div>

        {!isDelete && transaction && (
          <p className="text-xs text-muted-foreground">
            Previous: {transaction.category} ·{" "}
            {formatCurrency(transaction.amount)}
          </p>
        )}

        <DialogFooter className="flex-col sm:flex-row">
          {isDelete ? (
            <Button variant="destructive" size="lg" onClick={onConfirm}>
              <Trash2 className="size-4" />
              Delete
            </Button>
          ) : (
            <Button size="lg" onClick={onConfirm}>
              <Check className="size-4" />
              Update
            </Button>
          )}
          <Button
            variant="outline"
            size="lg"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
