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
import type { Goal } from "@/lib/goals";

const MAX_LABEL_LENGTH = 40;

export function GoalDialog({
  open,
  onOpenChange,
  mode,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initial?: Goal;
  onSubmit: (input: {
    label: string;
    targetAmount: number;
    iconKey: string;
    targetDate?: number;
  }) => void;
}) {
  const [label, setLabel] = React.useState(initial?.label ?? "");
  const [amount, setAmount] = React.useState(
    initial ? String(initial.targetAmount) : "",
  );
  const [iconKey, setIconKey] = React.useState(
    initial?.iconKey ?? DEFAULT_CATEGORY_ICON,
  );
  const [targetDate, setTargetDate] = React.useState(
    initial?.targetDate
      ? new Date(initial.targetDate).toISOString().slice(0, 10)
      : "",
  );

  function handleSubmit() {
    const trimmed = label.trim();

    if (!trimmed) {
      toast.error("Enter a goal name");
      return;
    }

    const value = Number(amount);
    if (!amount.trim() || !Number.isFinite(value) || value <= 0) {
      toast.error("Enter a target amount");
      return;
    }

    onSubmit({
      label: trimmed,
      targetAmount: value,
      iconKey,
      targetDate: targetDate ? new Date(targetDate).getTime() : undefined,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add goal" : "Edit goal"}</DialogTitle>
          <DialogDescription>
            Something you are saving up for, like a PS5 at ৳80,000.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground" htmlFor="goal-name">
              Goal
            </Label>
            <Input
              id="goal-name"
              value={label}
              maxLength={MAX_LABEL_LENGTH}
              placeholder="e.g. PS5"
              onChange={(event) => setLabel(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSubmit();
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground" htmlFor="goal-amount">
              Target amount
            </Label>
            <Input
              id="goal-amount"
              type="number"
              inputMode="decimal"
              min={0}
              value={amount}
              placeholder="0"
              onChange={(event) => setAmount(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSubmit();
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label
              className="text-xs text-muted-foreground"
              htmlFor="goal-date"
            >
              Target date
            </Label>
            <Input
              id="goal-date"
              type="date"
              value={targetDate}
              onChange={(event) => setTargetDate(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Icon</Label>
            <IconPicker value={iconKey} onChange={setIconKey} />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row">
          <Button size="lg" onClick={handleSubmit}>
            {mode === "create" ? "Add goal" : "Save changes"}
          </Button>
          <DialogClose render={<Button variant="outline" size="lg" />}>
            Cancel
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
