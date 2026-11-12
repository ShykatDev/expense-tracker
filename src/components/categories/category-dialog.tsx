"use client";

import * as React from "react";
import { toast } from "@yusufceng1z/ding-react";

import { IconPicker } from "@/components/categories/icon-picker";
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
import type { CustomCategory, TransactionType } from "@/lib/transactions";
import { cn } from "@/lib/utils";

const MAX_LABEL_LENGTH = 40;

export function CategoryDialog({
  open,
  onOpenChange,
  mode,
  type,
  initial,
  existingLabels,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  type: TransactionType;
  initial?: CustomCategory;
  existingLabels: string[];
  onSubmit: (input: {
    label: string;
    iconKey: string;
    type: TransactionType;
  }) => void;
}) {
  const [label, setLabel] = React.useState(initial?.label ?? "");
  const [iconKey, setIconKey] = React.useState(
    initial?.iconKey ?? DEFAULT_CATEGORY_ICON,
  );
  const [categoryType, setCategoryType] = React.useState<TransactionType>(
    initial?.type ?? type,
  );

  function handleSubmit() {
    const trimmed = label.trim();

    if (!trimmed) {
      toast.error("Enter a category name");
      return;
    }

    const duplicate = existingLabels.some(
      (existing) => existing.toLowerCase() === trimmed.toLowerCase(),
    );
    if (duplicate) {
      toast.error(`A category named "${trimmed}" already exists`);
      return;
    }

    onSubmit({ label: trimmed, iconKey, type: categoryType });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "New category" : "Edit category"}
          </DialogTitle>
          <DialogDescription>
            It shows up as a choice when you add a transaction.
          </DialogDescription>
        </DialogHeader>

        {/* min-w-0: the dialog is a grid; keep content within the sheet. */}
        <div className="flex min-w-0 flex-col gap-5">
          {/* Type, as on the entry screen. */}
          <div className="flex items-center justify-center gap-1" role="group" aria-label="Category type">
            {(
              [
                { value: "expense", label: "expenses" },
                { value: "income", label: "income" },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setCategoryType(option.value)}
                aria-pressed={categoryType === option.value}
                className={cn(
                  "rounded-full border-[1.5px] px-4 py-1.5 text-sm transition-colors",
                  categoryType === option.value
                    ? "border-white text-white"
                    : "border-transparent text-white/50 hover:text-white",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* A live preview of the chip, exactly as the entry screen shows it. */}
          <div className="flex flex-col items-center gap-2 rounded-3xl bg-white/[0.04] px-4 py-5">
            <div className="flex max-w-full items-center gap-1.5" aria-hidden="true">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-black">
                {React.createElement(getCategoryIconByKey(iconKey), { className: "size-[1.1rem]" })}
              </span>
              <span
                className={cn(
                  "flex h-11 min-w-0 items-center truncate rounded-full px-5 text-[15px] lowercase",
                  label.trim() ? "bg-white text-black" : "bg-white/10 text-white/50",
                )}
              >
                {label.trim() || "category name"}
              </span>
            </div>
            <p className="text-[11px] text-white/50">
              How it appears when you add {categoryType === "income" ? "income" : "an expense"}
            </p>
          </div>

          <input
            id="category-name"
            value={label}
            maxLength={MAX_LABEL_LENGTH}
            placeholder="Name it, e.g. Gym"
            aria-label="Category name"
            onChange={(event) => setLabel(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleSubmit();
            }}
            className="h-12 w-full rounded-full bg-white/6 px-5 text-center text-base text-white outline-none placeholder:text-white/50 focus:ring-1 focus:ring-white/25"
          />

          <div className="flex flex-col gap-2">
            <p className="px-1 text-xs text-white/50">Icon</p>
            <IconPicker value={iconKey} onChange={setIconKey} />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row">
          <Button size="lg" onClick={handleSubmit}>
            {mode === "create" ? "Add category" : "Save changes"}
          </Button>
          <DialogClose render={<Button variant="outline" size="lg" />}>
            Cancel
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
