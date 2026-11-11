"use client";

import * as React from "react";
import { toast } from "sonner";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_CATEGORY_ICON } from "@/lib/category-icons";
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
            {mode === "create" ? "Add category" : "Edit category"}
          </DialogTitle>
          <DialogDescription>
            Custom categories show up in the income and expense drawers.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["income", "expense"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setCategoryType(option)}
                  className={cn(
                    "h-11 rounded-full px-3 text-sm transition-colors",
                    categoryType === option
                      ? "bg-white text-black"
                      : "bg-white/6 text-white/60 hover:bg-white/10 hover:text-white",
                  )}
                >
                  {option === "income" ? "Income" : "Expense"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground" htmlFor="category-name">
              Name
            </Label>
            <Input
              id="category-name"
              value={label}
              maxLength={MAX_LABEL_LENGTH}
              placeholder="e.g. Gym"
              onChange={(event) => setLabel(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSubmit();
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Icon</Label>
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
