"use client";

import { ArrowUpRight, Check, Plus, X } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { INCOME_CATEGORIES, OTHER_CATEGORY_LABEL } from "@/lib/transactions";
import { cn } from "@/lib/utils";

interface CustomRow {
  id: string;
  label: string;
  amount: string;
}

export function IncomeDrawer({
  onSubmit,
}: {
  onSubmit: (entries: { category: string; amount: number }[]) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [amounts, setAmounts] = React.useState<Record<string, string>>({});
  const [customRows, setCustomRows] = React.useState<CustomRow[]>([]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setAmounts({});
      setCustomRows([]);
    }
  }

  function toggleCategory(key: string) {
    setAmounts((prev) => {
      if (key in prev) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: "" };
    });
  }

  function updateAmount(key: string, amount: string) {
    setAmounts((prev) => ({ ...prev, [key]: amount }));
  }

  function addCustomRow() {
    setCustomRows((prev) => [
      ...prev,
      { id: crypto.randomUUID(), label: "", amount: "" },
    ]);
  }

  function removeCustomRow(id: string) {
    setCustomRows((prev) => prev.filter((row) => row.id !== id));
  }

  function updateCustomRow(id: string, patch: Partial<Pick<CustomRow, "label" | "amount">>) {
    setCustomRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  function handleSubmit() {
    const categoryEntries = INCOME_CATEGORIES.filter(
      (category) => category.key in amounts,
    ).map((category) => ({
      category: category.label,
      amount: Number(amounts[category.key]),
    }));

    const customEntries = customRows.map((row) => ({
      category: row.label.trim() || OTHER_CATEGORY_LABEL,
      amount: Number(row.amount),
    }));

    const entries = [...categoryEntries, ...customEntries].filter(
      (entry) => entry.amount > 0,
    );

    if (entries.length === 0) {
      toast.error("Select a source and enter an amount");
      return;
    }

    onSubmit(entries);
    toast.success(
      `Added ${entries.length} income ${entries.length === 1 ? "entry" : "entries"}`,
    );
    handleOpenChange(false);
  }

  const selectedCategories = INCOME_CATEGORIES.filter(
    (category) => category.key in amounts,
  );

  return (
    <Drawer open={open} onOpenChange={handleOpenChange} showSwipeHandle>
      <DrawerTrigger
        render={
          <Button
            size="sm"
            aria-label="Add income"
            className="h-10 gap-2 border-emerald-500/25 bg-emerald-500/15 px-3 text-emerald-400 active:scale-[0.98] hover:bg-emerald-500/25 sm:px-4"
          />
        }
      >
        <ArrowUpRight className="size-5" />
        <span className="hidden sm:inline">Income</span>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Add income</DrawerTitle>
          <DrawerDescription>
            Pick a source, then enter the amount.
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-5 overflow-y-auto px-6 pb-4">
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
            {INCOME_CATEGORIES.map((category) => {
              const isSelected = category.key in amounts;
              return (
                <button
                  key={category.key}
                  type="button"
                  onClick={() => toggleCategory(category.key)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border p-5 text-sm font-medium transition-all duration-200 active:scale-95",
                    isSelected
                      ? "border-white/20 bg-white/10 text-foreground"
                      : "border-white/10 bg-white/3 text-muted-foreground hover:border-white/15 hover:bg-white/5 hover:text-foreground",
                  )}
                >
                  <category.icon className="size-6" />
                  <span className="text-center leading-tight">
                    {category.label}
                  </span>
                </button>
              );
            })}
          </div>

          {(selectedCategories.length > 0 || customRows.length > 0) && (
            <div className="flex flex-col gap-2.5">
              {selectedCategories.map((category) => (
                <div
                  key={category.key}
                  className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4 animate-in fade-in slide-in-from-top-1 duration-200"
                >
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/10">
                    <category.icon className="size-5 text-foreground" />
                  </div>
                  <div className="flex-1">
                    <Label className="text-sm text-muted-foreground">
                      {category.label}
                    </Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      autoFocus
                      value={amounts[category.key]}
                      onChange={(e) => updateAmount(category.key, e.target.value)}
                      placeholder="0"
                      className="h-11 border-0 bg-transparent py-0 pr-0 pl-2 text-2xl font-semibold tabular-nums shadow-none focus-visible:ring-0"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => toggleCategory(category.key)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}

              {customRows.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4 animate-in fade-in slide-in-from-top-1 duration-200"
                >
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/10">
                    <Plus className="size-5 text-foreground" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Input
                      autoFocus
                      value={row.label}
                      onChange={(e) => updateCustomRow(row.id, { label: e.target.value })}
                      placeholder="Source name"
                      className="h-7 border-0 bg-transparent py-0 pr-0 pl-2 text-sm text-muted-foreground shadow-none focus-visible:ring-0"
                    />
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={row.amount}
                      onChange={(e) => updateCustomRow(row.id, { amount: e.target.value })}
                      placeholder="0"
                      className="h-11 border-0 bg-transparent py-0 pr-0 pl-2 text-2xl font-semibold tabular-nums shadow-none focus-visible:ring-0"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => removeCustomRow(row.id)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Button
            variant="outline"
            className="gap-2 border-dashed"
            onClick={addCustomRow}
          >
            <Plus className="size-4" />
            Add another income source
          </Button>
        </div>
        <DrawerFooter>
          <Button className="gap-2" onClick={handleSubmit}>
            <Check className="size-4" />
            Save income
          </Button>
          <DrawerClose render={<Button variant="outline" className="gap-2" />}>
            <X className="size-4" />
            Cancel
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
