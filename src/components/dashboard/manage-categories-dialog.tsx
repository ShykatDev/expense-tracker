"use client";

import * as React from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  type TransactionType,
} from "@/lib/transactions";

function CategoryList({
  categories,
  hidden,
  onToggle,
}: {
  categories: typeof EXPENSE_CATEGORIES;
  hidden: string[];
  onToggle: (key: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      {categories.map((category) => {
        const isVisible = !hidden.includes(category.key);
        return (
          <label
            key={category.key}
            className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm"
          >
            <category.icon className="size-4 shrink-0 text-muted-foreground" />
            <span className="flex-1">{category.label}</span>
            <Switch
              checked={isVisible}
              onCheckedChange={() => onToggle(category.key)}
            />
          </label>
        );
      })}
    </div>
  );
}

export function ManageCategoriesDialog({
  open,
  onOpenChange,
  hidden,
  onToggleCategory,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hidden: Record<TransactionType, string[]>;
  onToggleCategory: (type: TransactionType, key: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage categories</DialogTitle>
          <DialogDescription>
            Toggle which categories show up in the income and expense
            drawers.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
          <div>
            <p className="mb-1 px-2 text-xs font-medium text-muted-foreground">
              Income
            </p>
            <CategoryList
              categories={INCOME_CATEGORIES}
              hidden={hidden.income}
              onToggle={(key) => onToggleCategory("income", key)}
            />
          </div>
          <div>
            <p className="mb-1 px-2 text-xs font-medium text-muted-foreground">
              Expense
            </p>
            <CategoryList
              categories={EXPENSE_CATEGORIES}
              hidden={hidden.expense}
              onToggle={(key) => onToggleCategory("expense", key)}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
