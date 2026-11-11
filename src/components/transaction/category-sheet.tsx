"use client";

import { Check, X } from "lucide-react";
import * as React from "react";

import type { ResolvedCategory } from "@/lib/transactions";
import { cn } from "@/lib/utils";

/**
 * A light bottom sheet for picking the category on the entry screen.
 *
 * It is hand-rolled rather than built on the shared Drawer because that one is
 * styled for the dark app chrome, and this screen is white.
 */
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
  const panelRef = React.useRef<HTMLDivElement>(null);

  // Prefill the custom field with a label that is not one of the chips, so an
  // edited "Other"-style entry can be adjusted rather than retyped.
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setCustom(selectedLabel && !isBuiltinSelected ? selectedLabel : "");
  }

  React.useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  function submitCustom(event: React.FormEvent) {
    event.preventDefault();
    const label = custom.trim();
    if (!label) return;
    onSelect(label);
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 transition-[visibility] duration-300",
        open ? "visible" : "invisible",
      )}
      aria-hidden={!open}
    >
      <div
        className={cn(
          "absolute inset-0 bg-black/30 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={() => onOpenChange(false)}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          "absolute inset-x-0 bottom-0 mx-auto flex max-h-[80dvh] max-w-md flex-col rounded-t-[2rem] bg-white text-neutral-900 shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.25)] outline-none",
          "pb-[max(1.25rem,env(safe-area-inset-bottom))] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          open ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="flex justify-center pt-3">
          <span className="h-1 w-10 rounded-full bg-neutral-200" />
        </div>

        <div className="flex items-center justify-between px-6 pt-3 pb-4">
          <h2 className="text-lg lowercase">{title}</h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="flex size-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition-colors hover:bg-neutral-200"
          >
            <X className="size-4" />
          </button>
        </div>

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
      </div>
    </div>
  );
}
