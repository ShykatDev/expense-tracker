"use client";

import { Gift, PiggyBank } from "lucide-react";
import * as React from "react";

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
import type { GoalCompletionSource } from "@/lib/goals";
import { formatCurrency } from "@/lib/transactions";
import { cn } from "@/lib/utils";

/**
 * Confirms how a goal was fulfilled.
 *
 * "savings" — the user bought it with their own money. The amount is
 * recorded as an expense so the purchase shows up in the history and the
 * savings figure drops by the same amount.
 *
 * "gift" — somebody gave it to them, so nothing is recorded and the savings
 * figure is untouched.
 */
export function GoalCompleteDialog({
  open,
  onOpenChange,
  goalLabel,
  goalAmount,
  savings,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalLabel: string;
  goalAmount: number;
  savings: number;
  onConfirm: (source: GoalCompletionSource) => void;
}) {
  const [source, setSource] = React.useState<GoalCompletionSource>("savings");

  const shortfall = goalAmount - savings;

  function handleConfirm() {
    onConfirm(source);
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setSource("savings");
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Got {goalLabel}?</DialogTitle>
          <DialogDescription>
            {formatCurrency(goalAmount)} goal. How did you get it?
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setSource("savings")}
            className={cn(
              "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
              source === "savings"
                ? "border-white/25 bg-white/10"
                : "border-white/10 bg-white/3 hover:bg-white/5",
            )}
          >
            <PiggyBank className="mt-0.5 size-4 shrink-0 text-foreground" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">
                Bought it with my savings
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Records {formatCurrency(goalAmount)} as an expense and drops
                your savings by the same amount.
              </span>
              {shortfall > 0 && (
                <span className="mt-1 block text-xs text-amber-400">
                  Your savings are {formatCurrency(shortfall)} short of this.
                </span>
              )}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSource("gift")}
            className={cn(
              "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
              source === "gift"
                ? "border-white/25 bg-white/10"
                : "border-white/10 bg-white/3 hover:bg-white/5",
            )}
          >
            <Gift className="mt-0.5 size-4 shrink-0 text-foreground" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">
                It was a gift
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Nothing is recorded and your savings stay as they are.
              </span>
            </span>
          </button>
        </div>

        <DialogFooter className="flex-col sm:flex-row">
          <Button size="lg" onClick={handleConfirm}>
            Mark as completed
          </Button>
          <DialogClose render={<Button variant="outline" size="lg" />}>
            Cancel
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
