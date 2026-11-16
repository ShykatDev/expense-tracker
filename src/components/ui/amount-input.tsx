"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/** Longest whole part, so amounts stay below ৳1,000,000,000. */
const MAX_WHOLE_DIGITS = 9;

/**
 * Cleans whatever was typed or pasted into a raw amount string: digits and
 * one ".", at most two decimals, no leading zeros. Commas (ours, or pasted)
 * are dropped. Kept as a string so "20." survives while it's being typed.
 */
export function sanitizeAmount(input: string) {
  const cleaned = input.replace(/[^0-9.]/g, "");
  if (!cleaned) return "";
  const dot = cleaned.indexOf(".");
  let whole = dot === -1 ? cleaned : cleaned.slice(0, dot);
  const fraction = dot === -1 ? undefined : cleaned.slice(dot + 1).replace(/\./g, "").slice(0, 2);
  whole = whole.replace(/^0+(?=\d)/, "").slice(0, MAX_WHOLE_DIGITS);
  if (fraction === undefined) return whole;
  return `${whole || "0"}.${fraction}`;
}

/** "1234567.5" → "1,234,567.5", keeping a trailing "." while typing. */
export function formatAmount(raw: string) {
  if (!raw) return "";
  const [whole, fraction] = raw.split(".");
  const grouped = whole ? Number(whole).toLocaleString("en-US") : "0";
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
}

/**
 * A large ৳ amount you type into with the phone's own number pad.
 *
 * It's a real text input with `inputMode="decimal"`, so phones show their
 * native digits-and-point keyboard (not letters, and no custom on-screen
 * keypad). The value is grouped with commas as it's typed, and the input
 * sizes itself to the number through an invisible copy of the text, so the
 * ৳ sign and any trailing hint stay snug against it.
 *
 * iPhone's number pad has no return key, so every screen using this keeps
 * its own visible Save / Next button; Enter still submits on keyboards that
 * have one.
 */
export function AmountInput({
  value,
  onChange,
  onSubmit,
  variant = "dark",
  autoFocus = false,
  label = "Amount",
  className,
  suffix,
}: {
  /** The raw amount, e.g. "1230.5" ("" when empty). */
  value: string;
  onChange: (raw: string) => void;
  /** Called on Enter. */
  onSubmit?: () => void;
  /** Light on the white entry screen, dark in the app's dialogs. */
  variant?: "light" | "dark";
  autoFocus?: boolean;
  label?: string;
  /** Text size and other type styles for the whole amount. */
  className?: string;
  /** Faint text right after the number, e.g. the implied ".00". */
  suffix?: React.ReactNode;
}) {
  const display = formatAmount(value);
  const muted = variant === "light" ? "text-neutral-300" : "text-white/30";
  const strong = variant === "light" ? "text-neutral-900" : "text-white";

  return (
    <label
      className={cn(
        "flex max-w-full cursor-text items-baseline justify-center font-display tracking-tight tabular-nums whitespace-nowrap",
        className,
      )}
    >
      {/* "৳" and the number are centred together, as one amount. The hidden
          copy sets the number's width and the input is laid over it, so the
          input's own default width never pushes the amount off centre. */}
      <span aria-hidden="true" className={value ? strong : muted}>
        ৳
      </span>
      <span className="relative inline-block min-w-0">
        <span aria-hidden="true" className="invisible whitespace-pre">
          {display || "0"}
        </span>
        <input
          type="text"
          inputMode="decimal"
          enterKeyHint="done"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          autoFocus={autoFocus}
          size={1}
          aria-label={label}
          placeholder="0"
          value={display}
          onChange={(event) => onChange(sanitizeAmount(event.target.value))}
          onKeyDown={(event) => {
            if (event.key === "Enter" && onSubmit) {
              event.preventDefault();
              onSubmit();
            }
          }}
          className={cn(
            "absolute inset-0 size-full min-w-0 bg-transparent p-0 text-center outline-none",
            strong,
            variant === "light"
              ? "caret-neutral-900 placeholder:text-neutral-300"
              : "caret-white placeholder:text-white/30",
          )}
        />
      </span>
      {suffix ? (
        <span aria-hidden="true" className={muted}>
          {suffix}
        </span>
      ) : null}
    </label>
  );
}
