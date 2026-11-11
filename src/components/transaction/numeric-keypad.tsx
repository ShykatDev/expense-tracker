"use client";

import { Check, Delete } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0"] as const;

export interface KeypadProps {
  /** The current amount as a raw string, e.g. "1230.5". */
  value: string;
  onChange: (next: string) => void;
  /** Called when the confirm key is pressed (ignored when `endKey` is "backspace"). */
  onConfirm?: () => void;
  disabled?: boolean;
  /** Light for the white entry screen, dark for dialogs on the dark app. */
  variant?: "light" | "dark";
  /** What the bottom-right key does: confirm (✓) or delete the last digit. */
  endKey?: "confirm" | "backspace";
  /** Smaller keys, for fitting inside a sheet. */
  compact?: boolean;
}

/**
 * Applies one key press to the raw amount string.
 *
 * The amount is kept as a string so a trailing "." survives between presses,
 * which is what lets the display show "20." while the user is still typing.
 */
export function applyKey(value: string, key: string) {
  if (key === ".") {
    if (value.includes(".")) return value;
    return value === "" ? "0." : `${value}.`;
  }

  const [whole = "", fraction] = value.split(".");
  if (fraction !== undefined && fraction.length >= 2) return value;
  if (fraction === undefined && whole.length >= 9) return value;

  // A leading zero is replaced rather than appended to.
  if (value === "0") return key;
  return value + key;
}

/**
 * A 3×4 keypad of soft circles: digits, a decimal point and, in the
 * bottom-right corner, a confirm tick or a delete key. Light on the white
 * entry screen; dark inside dialogs on the dark app.
 */
export function NumericKeypad({
  value,
  onChange,
  onConfirm,
  disabled,
  variant = "light",
  endKey = "confirm",
  compact = false,
}: KeypadProps) {
  const keyClass = cn(
    variant === "dark"
      ? "bg-white/6 text-white hover:bg-white/10 active:bg-white/14"
      : "bg-neutral-100 text-neutral-900 hover:bg-neutral-200/70 active:bg-neutral-200",
    compact ? "text-2xl" : "text-3xl",
  );

  return (
    <div
      className={cn(
        "mx-auto grid w-full grid-cols-3",
        compact ? "max-w-[16rem] gap-x-4 gap-y-2.5" : "max-w-[19rem] gap-x-5 gap-y-3.5",
      )}
      data-numeric-keypad
    >
      {KEYS.map((key) => (
        <KeypadButton
          key={key}
          className={keyClass}
          onClick={() => onChange(applyKey(value, key))}
          disabled={disabled}
          aria-label={key === "." ? "Decimal point" : key}
        >
          {key}
        </KeypadButton>
      ))}

      {endKey === "backspace" ? (
        <KeypadButton
          className={keyClass}
          onClick={() => onChange(value.slice(0, -1))}
          disabled={disabled}
          aria-label="Delete last digit"
        >
          <Delete className={compact ? "size-5" : "size-6"} strokeWidth={1.75} />
        </KeypadButton>
      ) : (
        <KeypadButton
          className={keyClass}
          onClick={onConfirm}
          disabled={disabled}
          aria-label="Save transaction"
        >
          <Check className={compact ? "size-6" : "size-7"} strokeWidth={1.75} />
        </KeypadButton>
      )}
    </div>
  );
}

function KeypadButton({
  children,
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "flex aspect-square w-full items-center justify-center rounded-full transition-[transform,background-color] duration-150 select-none active:scale-90 disabled:pointer-events-none disabled:opacity-40",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
