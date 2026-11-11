"use client";

import * as React from "react";
import { toast } from "sonner";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ResolvedCategory } from "@/lib/transactions";
import { cn } from "@/lib/utils";

export function TargetDialog({
  open,
  onOpenChange,
  mode,
  categories,
  initial,
  initialMonth,
  initialMonthLabel,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  categories: ResolvedCategory[];
  initial?: {
    categoryKey: string;
    categoryLabel: string;
    amount: number;
    overrideMonth?: string;
    overrideAmount?: number;
  };
  initialMonth: string;
  initialMonthLabel: string;
  onSubmit: (input: {
    categoryKey: string;
    categoryLabel: string;
    amount: number;
    overrideMonth?: string;
    overrideAmount?: number;
  }) => void;
}) {
  const [categoryKey, setCategoryKey] = React.useState(
    initial?.categoryKey ?? "",
  );
  const [amount, setAmount] = React.useState(
    initial ? String(initial.amount) : "",
  );
  const [useOverride, setUseOverride] = React.useState(
    initial?.overrideAmount !== undefined,
  );
  const [overrideAmount, setOverrideAmount] = React.useState(
    initial?.overrideAmount ? String(initial.overrideAmount) : "",
  );

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

    let override: { month: string; amount: number } | undefined;
    if (useOverride) {
      const overrideValue = Number(overrideAmount);
      if (!overrideAmount.trim() || !Number.isFinite(overrideValue) || overrideValue <= 0) {
        toast.error("Enter an amount for this month");
        return;
      }
      override = { month: initialMonth, amount: overrideValue };
    }

    onSubmit({
      categoryKey,
      categoryLabel: category.label,
      amount: value,
      overrideMonth: override?.month,
      overrideAmount: override?.amount,
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
            Cap what you spend each month on a category.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Category</Label>
            <div className="max-h-52 overflow-y-auto rounded-3xl bg-white/6">
              {categories.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted-foreground">
                  No expense categories available.
                </p>
              ) : (
                categories.map((category, index) => (
                  <button
                    key={category.key}
                    type="button"
                    onClick={() => setCategoryKey(category.key)}
                    className={cn(
                      "flex h-12 w-full items-center gap-3 px-4 text-left text-sm transition-colors",
                      index !== categories.length - 1 &&
                        "border-b border-white/6",
                      categoryKey === category.key
                        ? "bg-white/15 text-foreground"
                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                    )}
                  >
                    <category.icon className="size-4 shrink-0" />
                    <span className="truncate">{category.label}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground" htmlFor="target-amount">
              Monthly target
            </Label>
            <Input
              id="target-amount"
              type="number"
              inputMode="decimal"
              min={0}
              value={amount}
              placeholder="0"
              onChange={(event) => setAmount(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSubmit();
              }}
            />
          </div>

          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => setUseOverride((prev) => !prev)}
              className={cn(
                "h-11 w-full rounded-full px-4 text-left text-sm transition-colors",
                useOverride
                  ? "bg-white text-black"
                  : "bg-white/6 text-white/60 hover:bg-white/10 hover:text-white",
              )}
            >
              {useOverride
                ? `Only for ${initialMonthLabel}`
                : `Set a different amount for ${initialMonthLabel}`}
            </button>

            {useOverride && (
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                value={overrideAmount}
                placeholder="0"
                aria-label={`Target for ${initialMonthLabel}`}
                onChange={(event) => setOverrideAmount(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleSubmit();
                }}
              />
            )}
          </div>
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
