"use client";

import { Plus } from "lucide-react";
import * as React from "react";
import { toast } from "@yusufceng1z/ding-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NumericKeypad } from "@/components/transaction/numeric-keypad";
import type { ResolvedCategory } from "@/lib/transactions";
import { cn } from "@/lib/utils";

export function TargetDialog({
  open,
  onOpenChange,
  mode,
  categories,
  initial,
  initialMonthLabel,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  categories: ResolvedCategory[];
  /** The target being edited, with the amount that applies this month. */
  initial?: {
    categoryKey: string;
    categoryLabel: string;
    amount: number;
  };
  /** e.g. "November 2026": the month the saved value starts from. */
  initialMonthLabel: string;
  onSubmit: (input: {
    categoryKey: string;
    categoryLabel: string;
    amount: number;
  }) => void;
}) {
  const [categoryKey, setCategoryKey] = React.useState(
    initial?.categoryKey ?? "",
  );
  const [amount, setAmount] = React.useState(
    initial ? String(initial.amount) : "",
  );
  /** True while the category grid replaces the keypad. */
  const [picking, setPicking] = React.useState(false);
  const selectedCategory = categories.find((item) => item.key === categoryKey);
  const monthName = initialMonthLabel.split(" ")[0];

  function handleSubmit() {
    if (!categoryKey) {
      toast.error("Choose a category");
      return;
    }

    const category = categories.find((item) => item.key === categoryKey);
    if (!category) {
      toast.error("Choose a category");
      return;
    }

    const value = Number(amount);
    if (!amount.trim() || !Number.isFinite(value) || value <= 0) {
      toast.error("Enter a target amount");
      return;
    }

    onSubmit({
      categoryKey,
      categoryLabel: category.label,
      amount: value,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Set target" : "Edit target"}
          </DialogTitle>
          <DialogDescription>
            Saved for {monthName}. Later months keep this amount until you
            change it.
          </DialogDescription>
        </DialogHeader>

        {/* min-w-0: the dialog is a grid; keep its content from forcing the
            column wider than the sheet. */}
        <div className="flex min-w-0 flex-col gap-5">
          {/* The amount, large, like the entry screen. */}
          <div className="flex flex-col items-center gap-1.5">
            <p
              aria-live="polite"
              aria-label={`Monthly target ${amount || "0"}`}
              className="font-display text-5xl font-semibold tracking-tight tabular-nums whitespace-nowrap"
            >
              <span className={amount ? "text-white" : "text-white/30"}>৳</span>
              <span className={amount ? "text-white" : "text-white/30"}>
                {amount
                  ? Number(amount.replace(/\.$/, "")).toLocaleString("en-US") + (amount.endsWith(".") ? "." : "")
                  : "0"}
              </span>
            </p>
            <p className="text-xs text-white/50">
              per month, from {monthName} onward
            </p>
          </div>

          {/* Category, as on the entry screen: an icon chip plus a name pill. */}
          <button
            type="button"
            onClick={() => setPicking((prev) => !prev)}
            aria-expanded={picking}
            aria-label={selectedCategory ? `Category: ${selectedCategory.label}. Change` : "Choose a category"}
            className="mx-auto flex items-center gap-1.5 transition-transform active:scale-95"
          >
            <span
              className={cn(
                "flex size-10 items-center justify-center rounded-full",
                selectedCategory ? "bg-white text-black" : "bg-white/8 text-white/60",
              )}
            >
              {selectedCategory ? <selectedCategory.icon className="size-4" /> : <Plus className="size-4" />}
            </span>
            <span
              className={cn(
                "flex h-10 max-w-56 items-center truncate rounded-full px-4 text-[15px] lowercase",
                selectedCategory ? "bg-white text-black" : "bg-white/8 text-white/60",
              )}
            >
              {selectedCategory?.label ?? "category"}
            </span>
          </button>

          {/* The keypad, or — while choosing — the category grid in its place. */}
          {picking ? (
            <div
              role="radiogroup"
              aria-label="Category"
              className="grid max-h-[17.5rem] grid-cols-2 gap-2 overflow-y-auto animate-in fade-in duration-200"
            >
              {categories.length === 0 ? (
                <p className="col-span-2 text-center text-xs text-white/50">
                  No expense categories available.
                </p>
              ) : (
                categories.map((category) => {
                  const selected = categoryKey === category.key;
                  return (
                    <button
                      key={category.key}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => {
                        setCategoryKey(category.key);
                        setPicking(false);
                      }}
                      className={cn(
                        "flex min-w-0 items-center gap-2.5 rounded-full p-1.5 pr-4 text-left text-sm lowercase transition-colors active:scale-[0.98]",
                        selected
                          ? "bg-white text-black"
                          : "bg-white/6 text-white/80 hover:bg-white/10",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-full",
                          selected ? "bg-black text-white" : "bg-white/8 text-white",
                        )}
                      >
                        <category.icon className="size-4" />
                      </span>
                      <span className="truncate">{category.label}</span>
                    </button>
                  );
                })
              )}
            </div>
          ) : (
            <NumericKeypad
              value={amount}
              onChange={setAmount}
              variant="dark"
              endKey="backspace"
              compact
            />
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row">
          <Button size="lg" onClick={handleSubmit}>
            {mode === "create" ? "Set target" : "Save changes"}
          </Button>
          <DialogClose render={<Button variant="outline" size="lg" />}>
            Cancel
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
