"use client";

import { Check } from "lucide-react";
import * as React from "react";
import { toast } from "@yusufceng1z/ding-react";

import { useRecurring } from "@/components/recurring/recurring-provider";
import {
  RecurringCategoryIcon,
  parseTypedAmount,
} from "@/components/recurring/recurring-shared";
import { AmountInput } from "@/components/ui/amount-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { describeDue, type RecurringOccurrence } from "@/lib/recurring";
import { formatCurrency } from "@/lib/transactions";

/**
 * Confirm one occurrence with a different amount: bills vary, so the
 * electricity bill can be logged at what it actually came to. The rule's own
 * amount is untouched. Mount with `key={periodKey}` so it starts fresh.
 */
export function RecurringConfirmDialog({
  occurrence,
  onOpenChange,
}: {
  occurrence: RecurringOccurrence | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { confirmOccurrence, skipOccurrence, now } = useRecurring();
  const [amount, setAmount] = React.useState(
    occurrence ? String(occurrence.amount) : "",
  );

  function handleConfirm() {
    if (!occurrence) return;
    const value = parseTypedAmount(amount);
    if (value === null) {
      toast.error("Enter an amount");
      return;
    }
    if (confirmOccurrence(occurrence, value)) {
      toast.success(`${occurrence.category} · ${formatCurrency(value)} added`);
    }
    onOpenChange(false);
  }

  function handleSkip() {
    if (!occurrence) return;
    skipOccurrence(occurrence);
    toast.info(`Skipped ${occurrence.category}`);
    onOpenChange(false);
  }

  return (
    <Dialog open={occurrence !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm {occurrence?.type ?? "entry"}</DialogTitle>
          <DialogDescription>
            Adjust the amount if it came to something different this time.
          </DialogDescription>
        </DialogHeader>

        {occurrence && (
          <div className="flex min-w-0 flex-col gap-5">
            <div className="flex items-center gap-3 rounded-2xl bg-white/6 p-3">
              <RecurringCategoryIcon type={occurrence.type} category={occurrence.category} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-white">{occurrence.category}</p>
                <p className="truncate text-xs text-white/50">
                  {describeDue(occurrence.dueDate, now)}
                  {occurrence.note ? ` · ${occurrence.note}` : ""}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-1">
              <AmountInput
                value={amount}
                onChange={setAmount}
                onSubmit={handleConfirm}
                className="text-5xl font-semibold"
              />
              <p className="text-xs text-white/50">
                usually {formatCurrency(occurrence.amount)}
              </p>
            </div>

          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row">
          <Button size="lg" onClick={handleConfirm}>
            <Check className="size-4" />
            Confirm
          </Button>
          <Button variant="outline" size="lg" onClick={handleSkip}>
            Skip this one
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
