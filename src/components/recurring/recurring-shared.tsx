"use client";

import * as React from "react";

import { useCategories } from "@/components/categories/categories-provider";
import { resolveCategoryIcon } from "@/lib/categories";
import type { TransactionType } from "@/lib/transactions";
import { cn } from "@/lib/utils";

/** "80000" → "80,000", keeping a trailing "." while it is being typed. */
export function formatTyped(raw: string) {
  if (!raw) return "0";
  const trailingDot = raw.endsWith(".");
  return Number(raw.replace(/\.$/, "")).toLocaleString("en-US") + (trailingDot ? "." : "");
}

/** A typed keypad amount as a number, or null when it isn't a positive amount. */
export function parseTypedAmount(raw: string) {
  const value = Number(raw);
  return raw.trim() && Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * A rule's category icon in a round chip. Income gets the accent tint so
 * salary and rent are told apart at a glance, as in the history list.
 */
export function RecurringCategoryIcon({
  type,
  category,
  className,
}: {
  type: TransactionType;
  category: string;
  className?: string;
}) {
  const { categories } = useCategories();
  const icon = resolveCategoryIcon(type, category, categories[type]);
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full",
        type === "income" ? "bg-[#b9d0ff]/15 text-[#dfe8ff]" : "bg-white/8 text-white/80",
        className,
      )}
    >
      {React.createElement(icon, { className: "size-4" })}
    </span>
  );
}
