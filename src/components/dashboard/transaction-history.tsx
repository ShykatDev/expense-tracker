"use client";

import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  formatCurrency,
  getCategoryIcon,
  groupTransactionsByDay,
  type Transaction,
} from "@/lib/transactions";
import { cn } from "@/lib/utils";

export function TransactionHistory({
  transactions,
  onEdit,
  onDelete,
}: {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}) {
  const groups = groupTransactionsByDay(transactions);

  if (groups.length === 0) {
    return (
      <Card className="items-center justify-center py-12 text-center text-sm text-muted-foreground animate-in fade-in slide-in-from-bottom-2 duration-500">
        No entries for this period yet.
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-2">
          <span className="px-1 text-xs font-medium text-muted-foreground">
            {group.label}
          </span>
          <Card className="gap-0 py-1">
            {group.items.map((transaction, index) => {
              const Icon = getCategoryIcon(transaction.type, transaction.category);
              return (
                <div
                  key={transaction.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3",
                    index !== group.items.length - 1 && "border-b border-white/10",
                  )}
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/10">
                    <Icon className="size-4 text-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {transaction.category}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(transaction.createdAt).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                    {transaction.type === "income" ? "+" : "−"}
                    {formatCurrency(transaction.amount)}
                  </span>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Edit entry"
                      onClick={() => onEdit(transaction)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete entry"
                      onClick={() => onDelete(transaction)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
      ))}
    </div>
  );
}
