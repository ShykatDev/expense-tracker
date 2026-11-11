"use client";

import { ChevronRight, Database, Goal, Receipt, RotateCw, Tags, Target, Trash2 } from "lucide-react";
import * as React from "react";

import { useCategories } from "@/components/categories/categories-provider";
import { useTransactions } from "@/components/dashboard/transactions-provider";
import { useGoals } from "@/components/goals/goals-provider";
import {
  AppHero,
  AppSheet,
  AppShell,
  SheetSection,
} from "@/components/layout/app-shell";
import { useTargets } from "@/components/targets/targets-provider";
import { AnimatedNumber } from "@/components/ui/animated-number";
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
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Every key this app writes starts with this, so a reset can find them all. */
const STORAGE_PREFIX = "expense-tracker:";

/** Typed to confirm, so a reset can't happen from a stray tap. */
const CONFIRM_WORD = "RESET";

function clearAllData() {
  const keys: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(STORAGE_PREFIX)) keys.push(key);
  }
  for (const key of keys) window.localStorage.removeItem(key);
}

export function SettingsView() {
  const { transactions } = useTransactions();
  const { categories } = useCategories();
  const { goals } = useGoals();
  const { targets } = useTargets();

  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmText, setConfirmText] = React.useState("");

  const customCategoryCount = categories.income.length + categories.expense.length;

  const rows = [
    { label: "Transactions", count: transactions.length, icon: Receipt },
    { label: "Custom categories", count: customCategoryCount, icon: Tags },
    { label: "Monthly targets", count: targets.length, icon: Target },
    { label: "Goals", count: goals.length, icon: Goal },
  ];

  const [reloading, setReloading] = React.useState(false);

  // An installed web app has no browser reload button or pull-to-refresh,
  // so this is the way to pick up a new version. Data lives in
  // localStorage, so it survives the reload.
  function handleReload() {
    setReloading(true);
    window.location.reload();
  }

  function handleReset() {
    if (confirmText.trim().toUpperCase() !== CONFIRM_WORD) return;
    clearAllData();
    // Every provider holds its data in memory and only writes on change, so a
    // full reload is what guarantees nothing old is written back.
    window.location.replace("/");
  }

  return (
    <AppShell>
      <AppHero label="Settings" value={<AnimatedNumber value={transactions.length} />}>
        <p className="text-xs text-white/55">
          {transactions.length === 1 ? "entry" : "entries"} stored on this device
        </p>
      </AppHero>

      <AppSheet>
        <SheetSection
          title="Your data"
          subtitle="Everything is kept in this browser only — nothing is uploaded"
        >
          <Card className="gap-0 py-1">
            {rows.map((row, index) => (
              <div
                key={row.label}
                className={cn(
                  "flex items-center gap-3 px-4 py-3",
                  index !== rows.length - 1 && "border-b border-white/6",
                )}
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/8">
                  <row.icon className="size-4 text-white" />
                </div>
                <span className="min-w-0 flex-1 truncate text-sm text-white/80">
                  {row.label}
                </span>
                <span className="text-sm font-medium tabular-nums text-white">
                  {row.count}
                </span>
              </div>
            ))}
          </Card>
        </SheetSection>

        <SheetSection title="App">
          <Card className="gap-0 py-1">
            <button
              type="button"
              onClick={handleReload}
              disabled={reloading}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/4 active:bg-white/6 disabled:opacity-60"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/8">
                <RotateCw className={cn("size-4 text-white", reloading && "animate-spin")} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-white/85">
                  {reloading ? "Reloading…" : "Reload app"}
                </span>
                <span className="block text-xs text-white/50">
                  Refresh to pick up the latest version. Your data stays.
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-white/50" />
            </button>
          </Card>
        </SheetSection>

        <SheetSection title="Danger zone">
          <div className="flex flex-col gap-4 rounded-3xl bg-rose-500/8 p-5 ring-1 ring-rose-400/15">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-rose-300">
                <Database className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">Reset all data</p>
                <p className="mt-0.5 text-xs leading-relaxed text-white/50">
                  Permanently deletes every transaction, custom category,
                  target and goal, and restores the default categories. This
                  can&apos;t be undone.
                </p>
              </div>
            </div>
            <Button
              variant="destructive"
              size="lg"
              onClick={() => {
                setConfirmText("");
                setConfirmOpen(true);
              }}
            >
              <Trash2 />
              Reset all data
            </Button>
          </div>
        </SheetSection>
      </AppSheet>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset all data?</DialogTitle>
            <DialogDescription>
              This deletes {transactions.length}{" "}
              {transactions.length === 1 ? "transaction" : "transactions"},{" "}
              {customCategoryCount} custom{" "}
              {customCategoryCount === 1 ? "category" : "categories"},{" "}
              {targets.length} {targets.length === 1 ? "target" : "targets"} and{" "}
              {goals.length} {goals.length === 1 ? "goal" : "goals"}. Type{" "}
              <span className="font-semibold text-white">{CONFIRM_WORD}</span> to
              confirm.
            </DialogDescription>
          </DialogHeader>

          <Input
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleReset();
            }}
            placeholder={CONFIRM_WORD}
            autoComplete="off"
            aria-label={`Type ${CONFIRM_WORD} to confirm`}
          />

          <DialogFooter>
            <Button
              variant="destructive"
              size="lg"
              onClick={handleReset}
              disabled={confirmText.trim().toUpperCase() !== CONFIRM_WORD}
            >
              <Trash2 />
              Delete everything
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
