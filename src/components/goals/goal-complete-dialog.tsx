"use client";

import { Gift, PiggyBank, TriangleAlert } from "lucide-react";
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
 *
 * Buying it with savings that don't cover the price takes one more,
 * explicit confirmation ("Complete anyway"), since it pushes savings below
 * zero.
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
  /** "confirm" is the extra step shown when savings fall short. */
  const [step, setStep] = React.useState<"choose" | "confirm">("choose");

  const shortfall = goalAmount - savings;
  const isShort = shortfall > 0;

  function reset() {
    setSource("savings");
    setStep("choose");
  }

  function finish() {
    onConfirm(source);
    onOpenChange(false);
    reset();
  }

  function handlePrimary() {
    if (source === "savings" && isShort) {
      setStep("confirm");
      return;
    }
    finish();
  }

  const options = [
    {
      value: "savings" as const,
      icon: PiggyBank,
      title: "Bought it with my savings",
      detail: `Records ${formatCurrency(goalAmount)} as an expense, so your savings drop by the same.`,
      warning: isShort ? `Your savings are ${formatCurrency(shortfall)} short of this.` : null,
    },
    {
      value: "gift" as const,
      icon: Gift,
      title: "It was a gift",
      detail: "Nothing is recorded and your savings stay as they are.",
      warning: null,
    },
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        {step === "choose" ? (
          <>
            <DialogHeader>
              <DialogTitle>Got {goalLabel}?</DialogTitle>
              <DialogDescription>
                {formatCurrency(goalAmount)} goal. How did you get it?
              </DialogDescription>
            </DialogHeader>

            <div role="radiogroup" aria-label="How you got it" className="flex flex-col gap-2">
              {options.map((option) => {
                const selected = source === option.value;
                const OptionIcon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setSource(option.value)}
                    className={cn(
                      "flex items-start gap-3 rounded-3xl p-4 text-left ring-1 transition-colors",
                      selected ? "bg-white/10 ring-white/40" : "bg-white/5 ring-transparent hover:bg-white/8",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-full",
                        selected ? "bg-white text-black" : "bg-white/8 text-white",
                      )}
                    >
                      <OptionIcon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1 pt-0.5">
                      <span className="block text-sm font-medium text-white">{option.title}</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-white/55">
                        {option.detail}
                      </span>
                      {option.warning && (
                        <span className="mt-1.5 flex items-center gap-1 text-xs text-amber-200">
                          <TriangleAlert className="size-3.5 shrink-0" />
                          {option.warning}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            <DialogFooter>
              <Button size="lg" onClick={handlePrimary}>
                Mark as completed
              </Button>
              <DialogClose render={<Button variant="outline" size="lg" />}>Cancel</DialogClose>
            </DialogFooter>
          </>
        ) : (
          <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-right-2 duration-200">
            <DialogHeader className="items-center pr-0 pt-2 text-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-amber-400/12 text-amber-200 ring-1 ring-amber-300/20">
                <TriangleAlert className="size-6" />
              </span>
              <DialogTitle className="mt-2">Not enough savings</DialogTitle>
              <DialogDescription className="text-center">
                {goalLabel} costs {formatCurrency(goalAmount)} but you have{" "}
                {formatCurrency(Math.max(savings, 0))} saved. Completing it will put your
                savings {formatCurrency(shortfall)} below zero.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-3 divide-x divide-white/6 rounded-2xl bg-white/[0.04] py-3 text-center">
              <div className="px-2">
                <p className="text-[10px] text-white/50">Price</p>
                <p className="mt-0.5 text-[13px] font-medium tabular-nums text-white/85">
                  {formatCurrency(goalAmount)}
                </p>
              </div>
              <div className="px-2">
                <p className="text-[10px] text-white/50">Saved</p>
                <p className="mt-0.5 text-[13px] font-medium tabular-nums text-white/85">
                  {formatCurrency(Math.max(savings, 0))}
                </p>
              </div>
              <div className="px-2">
                <p className="text-[10px] text-white/50">Short by</p>
                <p className="mt-0.5 text-[13px] font-medium tabular-nums text-amber-200">
                  {formatCurrency(shortfall)}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button size="lg" variant="destructive" onClick={finish} className="tracking-wide uppercase">
                Complete anyway
              </Button>
              <Button size="lg" variant="outline" onClick={() => setStep("choose")}>
                Go back
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
