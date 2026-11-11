"use client";

import { Check } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0"] as const;

export interface KeypadProps {
  /** The current amount as a raw string, e.g. "1230.5". */
  value: string;
  onChange: (next: string) => void;
  /** Called when the confirm key is pressed. */
  onConfirm: () => void;
  disabled?: boolean;
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
 * A 3×4 keypad of soft grey circles: digits, a decimal point and a confirm
 * tick in the bottom-right corner.
 */
export function NumericKeypad({
  value,
  onChange,
  onConfirm,
  disabled,
}: KeypadProps) {
  return (
    <div
      className="mx-auto grid w-full max-w-[19rem] grid-cols-3 gap-x-5 gap-y-3.5"
      data-numeric-keypad
    >
      {KEYS.map((key) => (
        <KeypadButton
          key={key}
          onClick={() => onChange(applyKey(value, key))}
          disabled={disabled}
          aria-label={key === "." ? "Decimal point" : key}
        >
          {key}
        </KeypadButton>
      ))}

      <KeypadButton
        onClick={onConfirm}
        disabled={disabled}
        aria-label="Save transaction"
      >
        <Check className="size-7" strokeWidth={1.75} />
      </KeypadButton>
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
        "flex aspect-square w-full items-center justify-center rounded-full bg-neutral-100 text-3xl text-neutral-900 transition-[transform,background-color] duration-150 select-none hover:bg-neutral-200/70 active:scale-90 active:bg-neutral-200 disabled:pointer-events-none disabled:opacity-40",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
