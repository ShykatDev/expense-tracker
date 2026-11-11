"use client";

import { CalendarDays, X } from "lucide-react";
import * as React from "react";
import { toast } from "@yusufceng1z/ding-react";

import { IconPicker } from "@/components/categories/icon-picker";
import { NumericKeypad } from "@/components/transaction/numeric-keypad";
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
import { DEFAULT_CATEGORY_ICON, getCategoryIconByKey } from "@/lib/category-icons";
import type { Goal } from "@/lib/goals";
import { cn } from "@/lib/utils";

const MAX_LABEL_LENGTH = 40;

/** A date as "YYYY-MM-DD" in local time (toISOString would use UTC). */
function toLocalDateInput(time: number) {
  const date = new Date(time);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** "YYYY-MM-DD" → local midnight, so the saved day never shifts by timezone. */
function fromLocalDateInput(value: string) {
  return new Date(`${value}T00:00:00`).getTime();
}

/** "80000" → "80,000", keeping a trailing "." while it is being typed. */
function formatTyped(raw: string) {
  if (!raw) return "0";
  const trailingDot = raw.endsWith(".");
  return Number(raw.replace(/\.$/, "")).toLocaleString("en-US") + (trailingDot ? "." : "");
}

/**
 * Add or edit a goal, built like the entry screen: the name in a pill, the
 * target amount large with the keypad beneath it, and the icon and target
 * date as chips. Tapping the icon chip swaps the keypad for the icon grid.
 */
export function GoalDialog({
  open,
  onOpenChange,
  mode,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initial?: Goal;
  onSubmit: (input: {
    label: string;
    targetAmount: number;
    iconKey: string;
    targetDate?: number;
  }) => void;
}) {
  const [label, setLabel] = React.useState(initial?.label ?? "");
  const [amount, setAmount] = React.useState(initial ? String(initial.targetAmount) : "");
  const [iconKey, setIconKey] = React.useState(initial?.iconKey ?? DEFAULT_CATEGORY_ICON);
  const [targetDate, setTargetDate] = React.useState(
    initial?.targetDate ? toLocalDateInput(initial.targetDate) : "",
  );
  const dateInputRef = React.useRef<HTMLInputElement>(null);
  /** Today, captured once: target dates can't be in the past. */
  const [today] = React.useState(() => toLocalDateInput(Date.now()));

  // Open the platform's date picker. Phones open it on tap anyway; desktop
  // browsers only do with showPicker(), otherwise a click just selects the
  // day/month/year text.
  function openDatePicker() {
    const input = dateInputRef.current;
    if (!input) return;
    try {
      input.showPicker();
    } catch {
      input.focus();
      input.click();
    }
  }
  /** True while the icon grid replaces the keypad. */
  const [pickingIcon, setPickingIcon] = React.useState(false);

  const dateLabel = targetDate
    ? new Date(`${targetDate}T00:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  function handleSubmit() {
    const trimmed = label.trim();
    if (!trimmed) {
      toast.error("Enter a goal name");
      return;
    }

    const value = Number(amount);
    if (!amount.trim() || !Number.isFinite(value) || value <= 0) {
      toast.error("Enter a target amount");
      return;
    }

    onSubmit({
      label: trimmed,
      targetAmount: value,
      iconKey,
      targetDate: targetDate ? fromLocalDateInput(targetDate) : undefined,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New goal" : "Edit goal"}</DialogTitle>
          <DialogDescription>Something you’re saving up for.</DialogDescription>
        </DialogHeader>

        {/* min-w-0: the dialog is a grid; keep content within the sheet. */}
        <div className="flex min-w-0 flex-col gap-5">
          <input
            value={label}
            maxLength={MAX_LABEL_LENGTH}
            placeholder="What is it? e.g. PS5"
            aria-label="Goal name"
            onChange={(event) => setLabel(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleSubmit();
            }}
            className="h-12 w-full rounded-full bg-white/6 px-5 text-center text-base text-white outline-none placeholder:text-white/50 focus:ring-1 focus:ring-white/25"
          />

          {/* The target amount, large, as on the entry screen. */}
          <div className="flex flex-col items-center gap-1">
            <p
              aria-live="polite"
              aria-label={`Target amount ${amount || "0"}`}
              className="font-display text-5xl font-semibold tracking-tight tabular-nums whitespace-nowrap"
            >
              <span className={amount ? "text-white" : "text-white/30"}>৳</span>
              <span className={amount ? "text-white" : "text-white/30"}>{formatTyped(amount)}</span>
            </p>
            <p className="text-xs text-white/50">target price</p>
          </div>

          {/* Icon and target date, as chips. */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setPickingIcon((prev) => !prev)}
              aria-expanded={pickingIcon}
              aria-label="Choose an icon"
              className={cn(
                "flex h-10 items-center gap-2 rounded-full pr-4 pl-1.5 text-sm transition-colors active:scale-95",
                pickingIcon ? "bg-white text-black" : "bg-white/8 text-white/80 hover:bg-white/12",
              )}
            >
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full",
                  pickingIcon ? "bg-black text-white" : "bg-white text-black",
                )}
              >
                {React.createElement(getCategoryIconByKey(iconKey), { className: "size-3.5" })}
              </span>
              icon
            </button>

            {/* The chip opens the native date picker; the real input sits
                invisibly over it so a tap on a phone also reaches it. */}
            <span className="relative flex h-10 items-center gap-2 rounded-full bg-white/8 pr-4 pl-3 text-sm text-white/80 transition-colors focus-within:ring-1 focus-within:ring-white/25 hover:bg-white/12">
              <CalendarDays className="size-4 text-white/60" />
              {dateLabel ? `by ${dateLabel}` : "add a date"}
              <input
                ref={dateInputRef}
                type="date"
                value={targetDate}
                min={today}
                aria-label="Target date (optional)"
                onClick={(event) => {
                  event.preventDefault();
                  openDatePicker();
                }}
                onChange={(event) => setTargetDate(event.target.value)}
                className="absolute inset-0 size-full cursor-pointer appearance-none opacity-0 [color-scheme:dark]"
              />
            </span>
            {dateLabel && (
              <button
                type="button"
                onClick={() => setTargetDate("")}
                aria-label="Remove target date"
                className="flex size-8 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/8 hover:text-white"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* The keypad, or the icon grid in its place while choosing. */}
          {pickingIcon ? (
            <div className="animate-in fade-in duration-200">
              <IconPicker
                value={iconKey}
                onChange={(next) => {
                  setIconKey(next);
                  setPickingIcon(false);
                }}
              />
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
            {mode === "create" ? "Add goal" : "Save changes"}
          </Button>
          <DialogClose render={<Button variant="outline" size="lg" />}>Cancel</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
