"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { CategoryDialog } from "@/components/categories/category-dialog";
import { useCategories } from "@/components/categories/categories-provider";
import { useTransactions } from "@/components/dashboard/transactions-provider";
import { TargetsSection } from "@/components/targets/targets-section";
import { useTargets } from "@/components/targets/targets-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { resolveCategories } from "@/lib/categories";
import type { CustomCategory, TransactionType } from "@/lib/transactions";
import { cn } from "@/lib/utils";

const TYPE_OPTIONS: { value: TransactionType; label: string }[] = [
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
];

export function CategoriesView() {
  const {
    categories,
    addCategory,
    updateCategory,
    removeCategory,
    isLoaded,
    hidden,
    toggleCategory,
  } = useCategories();
  const { renameTransactionCategory } = useTransactions();
  const { renameTargetLabel } = useTargets();

  const [type, setType] = React.useState<TransactionType>("expense");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CustomCategory | null>(null);
  const [deleting, setDeleting] = React.useState<CustomCategory | null>(null);

  const resolved = React.useMemo(
    () => resolveCategories(type, categories[type]),
    [type, categories],
  );

  const customCategories = categories[type];

  const existingLabels = React.useMemo(
    () => resolved.map((category) => category.label),
    [resolved],
  );

  function handleSubmit(input: {
    label: string;
    iconKey: string;
    type: TransactionType;
  }) {
    if (editing) {
      const previousLabel = editing.label;

      updateCategory(editing.id, {
        label: input.label,
        iconKey: input.iconKey,
        type: input.type,
      });

      // A rename has to reach the history rows and any spending target, or
      // they would keep pointing at a label that no longer exists.
      if (previousLabel !== input.label) {
        renameTransactionCategory(editing.type, previousLabel, input.label);
        renameTargetLabel(editing.key, input.label);
      }

      toast.success(`Updated ${input.label}`);
      return;
    }

    addCategory(input);
    toast.success(`Added ${input.label}`);
  }

  function handleDelete() {
    if (!deleting) return;
    removeCategory(deleting.id);
    toast.success(`Deleted ${deleting.label}`);
    setDeleting(null);
  }

  return (
    <div className="flex flex-1 flex-col gap-6 pb-28 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
        <p className="text-sm text-muted-foreground">
          Add your own categories and choose which ones show up in the drawers.
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="glass flex w-fit items-center gap-1 rounded-full border border-white/10 p-1">
          {TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setType(option.value)}
              className={cn(
                "h-8 rounded-full px-4 text-xs font-medium transition-all",
                type === option.value
                  ? "bg-white/15 text-foreground shadow-[0_1px_0_0_rgba(255,255,255,0.1)_inset]"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" />
          Add category
        </Button>
      </div>

      {type === "expense" ? (
        <TargetsSection />
      ) : (
        <p className="text-xs text-muted-foreground">
          Targets apply to expense categories. Switch to the Expense tab to set
          one.
        </p>
      )}

      {!isLoaded ? (
        <Card className="gap-2 py-4">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className="h-10 animate-pulse rounded-lg bg-white/5"
            />
          ))}
        </Card>
      ) : (
        <Card className="gap-0 py-1">
          {resolved.map((category, index) => {
            const isVisible = !hidden[type].includes(category.key);
            const isCustom = category.source === "custom";
            return (
              <div
                key={category.key}
                className={cn(
                  "flex items-center gap-3 px-4 py-3",
                  index !== resolved.length - 1 && "border-b border-white/10",
                )}
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/10">
                  <category.icon className="size-4 text-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {category.label}
                  </p>
                </div>
                <Badge
                  variant={isCustom ? "secondary" : "outline"}
                  className="text-[0.65rem]"
                >
                  {isCustom ? "Custom" : "Built-in"}
                </Badge>
                <Switch
                  checked={isVisible}
                  onCheckedChange={() => toggleCategory(type, category.key)}
                  aria-label={`Toggle ${category.label}`}
                />
                {isCustom && (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Edit ${category.label}`}
                      onClick={() => {
                        setEditing(
                          customCategories.find((c) => c.id === category.id) ??
                            null,
                        );
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${category.label}`}
                      onClick={() =>
                        setDeleting(
                          customCategories.find((c) => c.id === category.id) ??
                            null,
                        )
                      }
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      )}

      <CategoryDialog
        key={editing?.id ?? "create"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={editing ? "edit" : "create"}
        type={type}
        initial={editing ?? undefined}
        existingLabels={existingLabels.filter(
          (label) => label.toLowerCase() !== (editing?.label ?? "").toLowerCase(),
        )}
        onSubmit={handleSubmit}
      />

      <Dialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete category?</DialogTitle>
            <DialogDescription>
              {deleting
                ? `"${deleting.label}" will be removed from the drawers. Existing entries keep their original name.`
                : "This category will be removed from the drawers."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row">
            <Button variant="destructive" size="lg" onClick={handleDelete}>
              <Trash2 className="size-4" />
              Delete
            </Button>
            <DialogClose render={<Button variant="outline" size="lg" />}>
              Cancel
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
