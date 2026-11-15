"use client";

import { CalendarDays, Check, ChevronLeft, ChevronRight, Shapes } from "lucide-react";
import * as React from "react";
import { toast } from "@yusufceng1z/ding-react";

import { useCategories } from "@/components/categories/categories-provider";
import { SheetToggle } from "@/components/layout/app-shell";
import { formatTyped, parseTypedAmount } from "@/components/recurring/recurring-shared";
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
import type { RecurringRuleInput } from "@/hooks/use-recurring";
import { resolveCategories, resolveCategoryIcon } from "@/lib/categories";
import {
  clampDayOfMonth,
  describeSchedule,
  type RecurringFrequency,
  type RecurringRule,
} from "@/lib/recurring";
import type { TransactionType } from "@/lib/transactions";
import { cn } from "@/lib/utils";

const MAX_NOTE_LENGTH = 60;
/**
 * The form asks one question per step, so it's always clear what the
 * current screen is for: what it is, how much, and when it repeats.
 */
const STEPS = ["what", "amount", "when"] as const;
type Step = (typeof STEPS)[number];
const DAYS = Array.from({ length: 31 }, (_, index) => index + 1);

const TYPE_OPTIONS: { value: TransactionType; label: string }[] = [
  { value: "expense", label: "expense" },
  { value: "income", label: "income" },
];
const FREQUENCY_OPTIONS: { value: RecurringFrequency; label: string }[] = [
  { value: "monthly", label: "monthly" },
  { value: "weekly", label: "weekly" },
  { value: "yearly", label: "yearly" },
];

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

/**
 * Add or edit a recurring rule in three steps: 1) expense or income and the
 * category, 2) the amount on the keypad, 3) how often, which day, from when,
 * and an optional note — ending on a plain-language summary. Editing opens
 * on the last step (the summary) and the step dots jump back to any step.
 * Mount with a `key` per rule so the fields start from `initial`.
 */
export function RecurringRuleDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: RecurringRule;
  onSubmit: (input: RecurringRuleInput) => void;
}) {
  const { categories, hidden } = useCategories();

  const [type, setType] = React.useState<TransactionType>(initial?.type ?? "expense");
  const [category, setCategory] = React.useState(initial?.category ?? "");
  const [amount, setAmount] = React.useState(initial ? String(initial.amount) : "");
  const [frequency, setFrequency] = React.useState<RecurringFrequency>(
    initial?.frequency ?? "monthly",
  );
  const [dayOfMonth, setDayOfMonth] = React.useState(initial?.dayOfMonth ?? 1);
  const [startDate, setStartDate] = React.useState(() =>
    toLocalDateInput(initial?.startDate ?? Date.now()),
  );
  const [note, setNote] = React.useState(initial?.note ?? "");
  const [step, setStep] = React.useState<Step>(initial ? "when" : "what");
  const stepIndex = STEPS.indexOf(step);
  const [customCategory, setCustomCategory] = React.useState("");
  const dateInputRef = React.useRef<HTMLInputElement>(null);

  // The same visible categories the entry screen offers for this type.
  const options = React.useMemo(
    () =>
      resolveCategories(type, categories[type]).filter(
        (option) => !hidden[type].includes(option.key),
      ),
    [categories, hidden, type],
  );
  // Looked up, not created: rendered via createElement below.
  const categoryIcon = category
    ? resolveCategoryIcon(type, category, categories[type])
    : Shapes;

  const schedule = describeSchedule({
    frequency,
    dayOfMonth,
    startDate: fromLocalDateInput(startDate),
  });
  /** Today as "YYYY-MM-DD", captured once so render stays pure. */
  const [today] = React.useState(() => toLocalDateInput(Date.now()));
  const startLabel =
    startDate === today
      ? "Today"
      : new Date(fromLocalDateInput(startDate)).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
  const amountValue = parseTypedAmount(amount);
  const weekday = new Date(fromLocalDateInput(startDate)).toLocaleDateString("en-US", {
    weekday: "long",
  });

  function changeType(next: TransactionType) {
    setType(next);
    // Salary isn't an expense: drop a category that belongs to the other side.
    const stillValid = resolveCategories(next, categories[next]).some(
      (option) => option.label === category,
    );
    if (!stillValid) setCategory("");
  }

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

  function pickCategory(label: string) {
    setCategory(label);
    // The next question follows straight away, titled with the category.
    setStep("amount");
  }

  function goNext() {
    if (step === "what") {
      if (!category.trim()) return toast.error("Pick a category");
      setStep("amount");
    } else if (step === "amount") {
      if (amountValue === null) return toast.error("Enter an amount");
      setStep("when");
    }
  }

  function handleSubmit() {
    if (!category.trim()) {
      toast.error("Pick a category");
      setStep("what");
      return;
    }
    const value = amountValue;
    if (value === null) {
      toast.error("Enter an amount");
      setStep("amount");
      return;
    }
    onSubmit({
      type,
      category: category.trim(),
      amount: value,
      frequency,
      dayOfMonth: clampDayOfMonth(dayOfMonth),
      startDate: startDate ? fromLocalDateInput(startDate) : Date.now(),
      note: note.trim() || undefined,
    });
    onOpenChange(false);
  }

  const title =
    step === "what"
      ? type === "income"
        ? "What income repeats?"
        : "What do you pay regularly?"
      : step === "amount"
        ? `How much is ${category || "it"}?`
        : `When is ${category || "it"} due?`;
  const hint =
    step === "what"
      ? "Pick a category, like rent, salary or a subscription."
      : step === "amount"
        ? frequency === "monthly"
          ? "The usual amount each month. You can change it when you confirm."
          : "The usual amount each time. You can change it when you confirm."
        : "It shows up as due on this schedule, and you confirm each one.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <p className="text-xs text-white/45">
            {initial ? "Edit recurring" : "New recurring"} · Step {stepIndex + 1} of {STEPS.length}
          </p>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{hint}</DialogDescription>
        </DialogHeader>

        {/* Step dots: done steps can be revisited; editing can reach all. */}
        <div className="flex items-center gap-1.5" aria-label="Steps">
          {STEPS.map((id, index) => {
            const reachable =
              Boolean(initial) ||
              index <= stepIndex ||
              (index === 1 && Boolean(category)) ||
              (index === 2 && Boolean(category) && amountValue !== null);
            return (
              <button
                key={id}
                type="button"
                disabled={!reachable}
                onClick={() => setStep(id)}
                aria-label={`Step ${index + 1}`}
                aria-current={id === step ? "step" : undefined}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors disabled:cursor-default",
                  index <= stepIndex ? "bg-white" : "bg-white/12",
                )}
              />
            );
          })}
        </div>

        {/* min-w-0: the dialog is a grid; keep content within the sheet. */}
        <div className="flex min-w-0 flex-col gap-4">
          {step === "what" && (
            <>
              <div className="flex justify-center">
                <SheetToggle label="Type" value={type} options={TYPE_OPTIONS} onChange={changeType} />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {options.map((option) => {
                  const selected = option.label === category;
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => pickCategory(option.label)}
                      className={cn(
                        "flex min-w-0 items-center gap-2 rounded-full p-1 pr-3 text-left text-sm transition-colors active:scale-[0.98]",
                        selected ? "bg-white text-black" : "bg-white/6 text-white/85 hover:bg-white/10",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-full",
                          selected ? "bg-black/10" : "bg-white/8",
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className="truncate">{option.label}</span>
                    </button>
                  );
                })}
              </div>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const label = customCategory.trim();
                  if (!label) return;
                  setCustomCategory("");
                  pickCategory(label);
                }}
                className="flex items-center gap-1.5"
              >
                <input
                  value={customCategory}
                  onChange={(event) => setCustomCategory(event.target.value)}
                  placeholder="Something else? e.g. Netflix"
                  aria-label="Custom category name"
                  className="h-10 min-w-0 flex-1 rounded-full bg-white/6 px-4 text-sm text-white outline-none placeholder:text-white/40 focus:ring-1 focus:ring-white/25"
                />
                <button
                  type="submit"
                  disabled={!customCategory.trim()}
                  aria-label="Use this name"
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-black transition-opacity disabled:opacity-30"
                >
                  <Check className="size-4" />
                </button>
              </form>
            </>
          )}

          {step === "amount" && (
            <>
              <div className="flex flex-col items-center gap-2">
                {/* What this amount is for, tappable to change it. */}
                <button
                  type="button"
                  onClick={() => setStep("what")}
                  className="flex h-8 items-center gap-1.5 rounded-full bg-white/8 pr-3 pl-1 text-xs text-white/80 transition-colors hover:bg-white/12"
                >
                  <span className="flex size-6 items-center justify-center rounded-full bg-white text-black">
                    {React.createElement(categoryIcon, { className: "size-3.5" })}
                  </span>
                  {category} · {type}
                </button>
                <p
                  aria-live="polite"
                  aria-label={`Amount ${amount || "0"}`}
                  className="font-display text-5xl font-semibold tracking-tight tabular-nums whitespace-nowrap"
                >
                  <span className={amount ? "text-white" : "text-white/30"}>৳</span>
                  <span className={amount ? "text-white" : "text-white/30"}>{formatTyped(amount)}</span>
                </p>
              </div>
              <NumericKeypad
                value={amount}
                onChange={setAmount}
                variant="dark"
                endKey="backspace"
                compact
              />
            </>
          )}

          {step === "when" && (
            <>
              <section className="flex flex-col gap-2">
                <h3 className="px-1 text-xs font-medium text-white/55">How often</h3>
                <SheetToggle
                  compact
                  label="How often"
                  value={frequency}
                  options={FREQUENCY_OPTIONS}
                  onChange={setFrequency}
                />
              </section>

              {frequency === "monthly" ? (
                <section className="flex flex-col gap-2">
                  <h3 className="px-1 text-xs font-medium text-white/55">On which day of the month</h3>
                  <div className="grid grid-cols-7 gap-1 rounded-3xl bg-white/4 p-1.5">
                    {DAYS.map((day) => (
                      <button
                        key={day}
                        type="button"
                        aria-pressed={day === dayOfMonth}
                        aria-label={`Day ${day}`}
                        onClick={() => setDayOfMonth(day)}
                        className={cn(
                          "flex h-9 items-center justify-center rounded-full text-sm tabular-nums transition-colors",
                          day === dayOfMonth ? "bg-white text-black" : "text-white/75 hover:bg-white/8",
                        )}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                  {dayOfMonth > 28 && (
                    <p className="px-1 text-[11px] text-white/45">
                      Shorter months use their last day.
                    </p>
                  )}
                </section>
              ) : null}

              {/* The start date as a labelled row; the real date input sits
                  invisibly over it so a tap on a phone reaches it. */}
              <section className="flex flex-col gap-2">
                <h3 className="px-1 text-xs font-medium text-white/55">Starting from</h3>
                <span className="relative flex h-12 items-center gap-3 rounded-2xl bg-white/6 px-4 text-sm text-white focus-within:ring-1 focus-within:ring-white/25">
                  <CalendarDays className="size-4 text-white/55" />
                  <span className="flex-1">{startLabel}</span>
                  <span className="text-xs text-white/45">
                    {frequency === "weekly"
                      ? `repeats every ${weekday}`
                      : frequency === "yearly"
                        ? "repeats on this date"
                        : "nothing is due before this"}
                  </span>
                  <ChevronRight className="size-4 text-white/40" />
                  <input
                    ref={dateInputRef}
                    type="date"
                    value={startDate}
                    required
                    aria-label="Starting from"
                    onClick={(event) => {
                      event.preventDefault();
                      openDatePicker();
                    }}
                    onChange={(event) => {
                      if (event.target.value) setStartDate(event.target.value);
                    }}
                    className="absolute inset-0 size-full cursor-pointer appearance-none rounded-2xl opacity-0 [color-scheme:dark]"
                  />
                </span>
              </section>

              <section className="flex flex-col gap-2">
                <h3 className="px-1 text-xs font-medium text-white/55">Note (optional)</h3>
                <input
                  value={note}
                  maxLength={MAX_NOTE_LENGTH}
                  placeholder="e.g. Flat 4B"
                  aria-label="Note"
                  onChange={(event) => setNote(event.target.value)}
                  className="h-12 min-w-0 rounded-2xl bg-white/6 px-4 text-sm text-white outline-none placeholder:text-white/40 focus:ring-1 focus:ring-white/25"
                />
              </section>

              {/* Everything in one sentence, so the user can check it. */}
              <div className="flex items-center gap-3 rounded-2xl bg-[#a9c4ff]/10 px-4 py-3 ring-1 ring-[#a9c4ff]/20">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-black">
                  {React.createElement(categoryIcon, { className: "size-4" })}
                </span>
                <p className="min-w-0 text-sm leading-snug text-white/85">
                  <span className="font-medium text-white tabular-nums">
                    ৳{formatTyped(amount)}
                  </span>{" "}
                  {category} {type === "income" ? "comes in" : "is due"}{" "}
                  {schedule.toLowerCase()}, starting {startLabel === "Today" ? "today" : startLabel}.
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row">
          {step === "when" ? (
            <Button size="lg" onClick={handleSubmit}>
              {initial ? "Save changes" : "Add recurring"}
            </Button>
          ) : step === "amount" ? (
            <Button size="lg" onClick={goNext} disabled={amountValue === null}>
              Next
              <ChevronRight className="size-4" />
            </Button>
          ) : null}
          {stepIndex > 0 ? (
            <Button variant="outline" size="lg" onClick={() => setStep(STEPS[stepIndex - 1])}>
              <ChevronLeft className="size-4" />
              Back
            </Button>
          ) : (
            <DialogClose render={<Button variant="outline" size="lg" />}>Cancel</DialogClose>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
