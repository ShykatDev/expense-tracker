"use client";

import { Pencil, Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "@yusufceng1z/ding-react";

import { CategoryDialog } from "@/components/categories/category-dialog";
import { useCategories } from "@/components/categories/categories-provider";
import { useTransactions } from "@/components/dashboard/transactions-provider";
import { TargetsSection } from "@/components/targets/targets-section";
import { useTargets } from "@/components/targets/targets-provider";
import {
  AppHero,
  AppSheet,
  AppShell,
  RowIconButton,
  SheetSection,
  SheetToggle,
} from "@/components/layout/app-shell";
import { AnimatedNumber } from "@/components/ui/animated-number";
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
  { value: "expense", label: "expenses" },
  { value: "income", label: "income" },
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
  const visibleCount = resolved.filter(
    (category) => !hidden[type].includes(category.key),
  ).length;

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
    <AppShell>
      <AppHero
        label={type === "expense" ? "Expense Categories" : "Income Sources"}
        value={<AnimatedNumber value={visibleCount} />}
        action={{
          label: "Add category",
          onClick: () => {
            setEditing(null);
            setDialogOpen(true);
          },
        }}
      >
        <p className="text-xs text-white/55">
          shown in the entry screen · {resolved.length - visibleCount} hidden
        </p>
        <div className="mt-5">
          <SheetToggle
            label="Category type"
            value={type}
            options={TYPE_OPTIONS}
            onChange={setType}
          />
        </div>
      </AppHero>

      <AppSheet>
      {type === "expense" ? (
        <TargetsSection />
      ) : (
        <p className="rounded-2xl bg-white/6 px-5 py-4 text-center text-xs text-white/45">
          Targets apply to expense categories. Switch to expenses to set one.
        </p>
      )}

      <SheetSection
        title={type === "expense" ? "All categories" : "All sources"}
        subtitle="Toggle off the ones you don't use"
      >
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
                  index !== resolved.length - 1 && "border-b border-white/6",
                )}
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/8">
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
                    <RowIconButton
                      aria-label={`Edit ${category.label}`}
                      onClick={() => {
                        setEditing(
                          customCategories.find((c) => c.id === category.id) ??
                            null,
                        );
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil />
                    </RowIconButton>
                    <RowIconButton
                      aria-label={`Delete ${category.label}`}
                      onClick={() =>
                        setDeleting(
                          customCategories.find((c) => c.id === category.id) ??
                            null,
                        )
                      }
                    >
                      <Trash2 />
                    </RowIconButton>
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      )}
      </SheetSection>
      </AppSheet>

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
    </AppShell>
  );
}
