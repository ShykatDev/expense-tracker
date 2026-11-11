"use client";

import { Plus, TrendingDown } from "lucide-react";
import * as React from "react";

import { AppMark } from "@/components/brand/app-logo";
import { MonthPicker } from "@/components/dashboard/navbar";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { formatCurrency } from "@/lib/transactions";
import { cn } from "@/lib/utils";

/**
 * The page frame every app route shares: a dark blue hero at the top and a
 * black rounded sheet rising over it.
 *
 * Full-bleed on phones; on wider screens it becomes a rounded, phone-like
 * column so the composition holds together.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="reveal-target flex flex-1 flex-col animate-in fade-in duration-500 md:overflow-hidden md:rounded-[2rem] md:border md:border-white/10">
      {children}
    </div>
  );
}

/** The deep navy gradient. It fades to black so the sheet reads as one surface. */
const HERO_BACKGROUND =
  "radial-gradient(75% 55% at 88% 30%, rgba(59,130,246,0.24) 0%, rgba(59,130,246,0) 70%), radial-gradient(60% 45% at 0% 0%, rgba(96,165,250,0.10) 0%, rgba(96,165,250,0) 70%), linear-gradient(180deg, #0a1f52 0%, #08183d 34%, #050e24 66%, #020409 100%)";

/**
 * The hero: the minimal Pulse mark on the left, an optional month picker and the
 * page's primary action on the right, and the headline figure centred.
 */
export function AppHero({
  label,
  value,
  action,
  showMonthPicker = false,
  children,
}: {
  /** Small caption above the headline figure, e.g. "Total Savings". */
  label: string;
  /** The headline figure. */
  value: React.ReactNode;
  /** The round "+" on the right. Omit to hide it. */
  action?: { label: string; onClick: () => void };
  showMonthPicker?: boolean;
  /** Supporting content under the figure. */
  children?: React.ReactNode;
}) {
  return (
    <section
      // Top padding = the status-bar inset plus a gap, so the header clears
      // the soft blur iOS draws just below the status bar in standalone mode.
      className="relative isolate overflow-hidden px-5 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-20 sm:px-8"
      style={{ background: HERO_BACKGROUND }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent"
      />

      <header
        data-hero-header
        className="relative z-10 flex items-center justify-between gap-3"
      >
        <div
          className="flex size-10 items-center justify-center"
          role="img"
          aria-label="Pulse"
        >
          <AppMark className="size-6 text-white" />
        </div>

        <div className="flex items-center gap-2">
          {showMonthPicker && (
            <MonthPicker className="h-10 min-w-0 bg-white/12 px-4 text-xs text-white/85 ring-1 ring-white/15 hover:bg-white/20 [&_svg]:text-white/60" />
          )}
          {action && (
            <button
              type="button"
              aria-label={action.label}
              onClick={action.onClick}
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/12 text-white ring-1 ring-white/15 transition-[transform,background-color] duration-200 hover:bg-white/20 active:scale-90"
            >
              <Plus className="size-5" strokeWidth={1.75} />
            </button>
          )}
        </div>
      </header>

      <div
        data-hero-content
        className="relative flex flex-col items-center pt-12 text-center [@media(max-height:760px)]:pt-6"
      >
        <p className="text-sm font-semibold text-white/90">{label}</p>
        <div className="mt-1 font-display text-[3.25rem] leading-tight font-bold tracking-tight tabular-nums text-white">
          {value}
        </div>
        {children}
      </div>
    </section>
  );
}

/** The black sheet with its drag handle, overlapping the bottom of the hero. */
export function AppSheet({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative -mt-10 flex flex-1 flex-col gap-10 rounded-t-[2rem] bg-[linear-gradient(180deg,#121316_0%,#060607_20rem,#000_100%)] px-5 pt-3 pb-[calc(7rem+env(safe-area-inset-bottom))] shadow-[0_-1px_0_0_rgba(255,255,255,0.06)] sm:px-8",
        className,
      )}
    >
      <div className="flex justify-center" aria-hidden="true">
        <span className="h-1 w-10 rounded-full bg-white/20" />
      </div>
      {children}
    </div>
  );
}

/**
 * A section heading inside the sheet: title (and optional subtitle) on the
 * left, an optional control on the right. `centered` gives the quiet,
 * centred caption used above simple lists.
 */
export function SheetSection({
  title,
  subtitle,
  action,
  centered = false,
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  centered?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      {centered ? (
        <h2 className="text-center text-xs font-medium text-white/50">
          {title}
        </h2>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-white">{title}</h2>
            {subtitle && (
              <p className="mt-0.5 text-xs text-white/50">{subtitle}</p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** The pill-style segmented toggle used inside the sheet. */
export function SheetToggle<T extends string>({
  value,
  options,
  onChange,
  label,
  compact = false,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
  /** Tighter pills, for sharing a row with another control. */
  compact?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("flex shrink-0 items-center", compact ? "gap-0" : "gap-1")}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={cn(
            "rounded-full border-[1.5px] py-1.5 lowercase whitespace-nowrap transition-colors duration-200",
            compact ? "px-3 text-[13px]" : "px-4 text-sm",
            value === option.value
              ? "border-white text-white"
              : "border-transparent text-white/50 hover:text-white",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** A small round icon button for row actions (edit, delete, …). */
export function RowIconButton({
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white active:scale-90 [&_svg]:size-3.5",
        className,
      )}
      {...props}
    />
  );
}

/** The dark pill button used for secondary actions inside the sheet. */
export function SheetButton({
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-4 text-xs text-white/80 transition-colors hover:bg-white/15 active:scale-95 [&_svg]:size-3.5",
        className,
      )}
      {...props}
    />
  );
}

/**
 * A hero money figure that counts to its value and makes a negative amount
 * unmistakable: it turns a soft red and gains a small "down" badge, so a
 * deficit never reads like an ordinary balance at a glance.
 */
export function HeroAmount({ value }: { value: number }) {
  const negative = value < 0;
  return (
    <span className="inline-flex items-center justify-center gap-2.5">
      {negative && (
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/25 animate-in fade-in zoom-in-75 duration-300"
          aria-hidden="true"
        >
          <TrendingDown className="size-[1.1rem]" strokeWidth={2.2} />
        </span>
      )}
      <span className={cn("transition-colors duration-500", negative && "text-rose-200")}>
        <AnimatedNumber value={value} format={formatCurrency} />
      </span>
      {negative && <span className="sr-only">(deficit)</span>}
    </span>
  );
}
