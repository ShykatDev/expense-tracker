"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  Sparkles,
  ThumbsUp,
  TriangleAlert,
  Minus,
  Scale,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { AppHero } from "@/components/layout/app-shell";
import { TRANSITION } from "@/components/layout/page-transition";
import type { SavingsTone, SavingsVerdict } from "@/lib/savings";
import { formatCurrency } from "@/lib/transactions";
import { cn } from "@/lib/utils";

const TONE_STYLES: Record<SavingsTone, { icon: typeof Sparkles; dot: string; text: string }> = {
  great: { icon: Sparkles, dot: "bg-emerald-400/20 text-emerald-300", text: "text-emerald-200" },
  good: { icon: ThumbsUp, dot: "bg-sky-400/20 text-sky-300", text: "text-sky-100" },
  tight: { icon: Scale, dot: "bg-amber-400/20 text-amber-300", text: "text-amber-100" },
  over: { icon: TriangleAlert, dot: "bg-rose-400/20 text-rose-300", text: "text-rose-100" },
  neutral: { icon: Minus, dot: "bg-white/15 text-white/70", text: "text-white" },
};

/**
 * The dashboard hero: the month's savings as the headline, a verdict on how
 * healthy that is, and the income and expense figures that produced it.
 */
export function DashboardHero({
  savings,
  income,
  expense,
  verdict,
}: {
  savings: number;
  income: number;
  expense: number;
  verdict: SavingsVerdict;
}) {
  const router = useRouter();
  const tone = TONE_STYLES[verdict.tone];
  const ToneIcon = tone.icon;

  return (
    <AppHero
      label="Total Savings"
      value={formatCurrency(savings)}
      showMonthPicker
      action={{ label: "Add transaction", onClick: () => router.push("/transaction", { transitionTypes: [...TRANSITION.sheetUp] }) }}
    >
      {/* Verdict */}
      <div className="mt-4 flex max-w-sm items-start gap-2.5 rounded-2xl bg-white/8 px-3.5 py-2.5 text-left ring-1 ring-white/10">
        <span className={cn("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full", tone.dot)}>
          <ToneIcon className="size-3.5" />
        </span>
        <div className="min-w-0">
          <p className={cn("text-sm font-semibold", tone.text)}>{verdict.title}</p>
          <p className="text-xs leading-relaxed text-white/60">{verdict.detail}</p>
        </div>
      </div>

      <HeroFigures income={income} expense={expense} />
    </AppHero>
  );
}

/** Income and expense side by side; each one opens the add screen for its type. */
export function HeroFigures({ income, expense }: { income: number; expense: number }) {
  const router = useRouter();
  return (
    <div className="mt-6 flex w-full max-w-sm items-center">
      <Figure
        label="Income"
        value={income}
        icon={ArrowUpRight}
        iconClass="bg-emerald-400/15 text-emerald-300"
        onClick={() => router.push("/transaction?type=income", { transitionTypes: [...TRANSITION.sheetUp] })}
      />
      <span aria-hidden="true" className="h-10 w-px shrink-0 bg-white/12" />
      <Figure
        label="Expense"
        value={expense}
        icon={ArrowDownRight}
        iconClass="bg-rose-400/15 text-rose-300"
        onClick={() => router.push("/transaction?type=expense", { transitionTypes: [...TRANSITION.sheetUp] })}
      />
    </div>
  );
}

function Figure({
  label,
  value,
  icon: Icon,
  iconClass,
  onClick,
}: {
  label: string;
  value: number;
  icon: typeof ArrowUpRight;
  iconClass: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label} ${formatCurrency(value)}. Add ${label.toLowerCase()}`}
      className="flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-1 transition-colors hover:bg-white/5"
    >
      <span className="flex items-center gap-1.5 text-xs text-white/55">
        <span className={cn("flex size-4.5 items-center justify-center rounded-full", iconClass)}>
          <Icon className="size-3" />
        </span>
        {label}
      </span>
      <span className="text-lg font-semibold tabular-nums text-white">
        {formatCurrency(value)}
      </span>
    </button>
  );
}
