"use client";

import { Check } from "lucide-react";
import * as React from "react";

import { LightSheet } from "@/components/transaction/light-sheet";
import type { ResolvedCategory } from "@/lib/transactions";
import { cn } from "@/lib/utils";

/** The light bottom sheet for picking the category on the entry screen. */
export function CategorySheet({
  open,
  onOpenChange,
  title,
  categories,
  selectedLabel,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  categories: ResolvedCategory[];
  selectedLabel: string | null;
  onSelect: (label: string) => void;
}) {
  const isBuiltinSelected = categories.some((c) => c.label === selectedLabel);
  const [custom, setCustom] = React.useState("");

  // Prefill the custom field with a label that is not one of the chips, so an
  // edited "Other"-style entry can be adjusted rather than retyped.
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setCustom(selectedLabel && !isBuiltinSelected ? selectedLabel : "");
  }

  function submitCustom(event: React.FormEvent) {
    event.preventDefault();
    const label = custom.trim();
    if (!label) return;
    onSelect(label);
  }

  return (
    <LightSheet open={open} onOpenChange={onOpenChange} title={title}>
      <div className="grid grid-cols-2 gap-2 overflow-y-auto px-6">
        {categories.map((category) => {
          const isSelected = category.label === selectedLabel;
          const Icon = category.icon;
          return (
            <button
              key={category.key}
              type="button"
              onClick={() => onSelect(category.label)}
              aria-pressed={isSelected}
              className={cn(
                "flex min-w-0 items-center gap-2.5 rounded-full p-1.5 pr-4 text-left text-sm lowercase transition-colors active:scale-[0.98]",
                isSelected
                  ? "bg-black text-white"
                  : "bg-neutral-100 text-neutral-900 hover:bg-neutral-200/70",
              )}
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full",
                  isSelected ? "bg-white/15" : "bg-black text-white",
                )}
              >
                <Icon className="size-4" />
              </span>
              <span className="truncate">{category.label}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={submitCustom} className="flex items-center gap-2 px-6 pt-4">
        <input
          value={custom}
          onChange={(event) => setCustom(event.target.value)}
          placeholder="or type a name, e.g. burger king"
          className="h-11 min-w-0 flex-1 rounded-full bg-neutral-100 px-4 text-sm text-neutral-900 outline-none placeholder:text-neutral-500 focus:ring-2 focus:ring-black/10"
          aria-label="Custom category name"
        />
        <button
          type="submit"
          disabled={!custom.trim()}
          aria-label="Use custom name"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-black text-white transition-opacity disabled:opacity-30"
        >
          <Check className="size-4" />
        </button>
      </form>
    </LightSheet>
  );
}
