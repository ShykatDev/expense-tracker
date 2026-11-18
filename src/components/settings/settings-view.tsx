"use client";

import {
  ChevronRight,
  Database,
  Repeat,
  RotateCw,
  Trash2,
  Smartphone,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "@yusufceng1z/ding-react";

import { AccountsSection } from "@/components/accounts/accounts-section";
import { AccountCard } from "@/components/auth/account-card";
import { useAccounts } from "@/components/accounts/accounts-provider";
import { useCategories } from "@/components/categories/categories-provider";
import { useTransactions } from "@/components/dashboard/transactions-provider";
import { useGoals } from "@/components/goals/goals-provider";
import { useRecurring } from "@/components/recurring/recurring-provider";
import { ExpandableSheet } from "@/components/layout/expandable-sheet";
import {
  AppHero,
  SheetSection,
} from "@/components/layout/app-shell";
import { DeleteAccountBlock } from "@/components/settings/delete-account";
import { InstallGuideDialog } from "@/components/settings/install-guide-dialog";
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
import { HoldButton } from "@/components/ui/hold-button";
import { deleteAllAccountsAction } from "@/app/actions/accounts";
import { deleteAllCategoriesAction } from "@/app/actions/categories";
import { deleteAllGoalsAction } from "@/app/actions/goals";
import { deleteAllRecurringAction } from "@/app/actions/recurring";
import { deleteAllTargetsAction } from "@/app/actions/targets";
import { deleteAllTransactionsAction } from "@/app/actions/transactions";
import { clearGoalImages } from "@/lib/goal-images";
import { cn } from "@/lib/utils";

/** Every key this app writes starts with this, so a reset can find them all. */
const STORAGE_PREFIX = "expense-tracker:";


function clearAllData() {
  const keys: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(STORAGE_PREFIX)) keys.push(key);
  }
  for (const key of keys) window.localStorage.removeItem(key);
}

export function SettingsView({
  authEnabled = false,
  synced = false,
}: {
  /** Google sign-in is configured, so the account card can sign in. */
  authEnabled?: boolean;
  /** Data lives in Neon (signed in, not a guest who skipped sign-in). */
  synced?: boolean;
}) {
  const { transactions } = useTransactions();
  const { categories } = useCategories();
  const { goals } = useGoals();
  const { rules: recurringRules, due: recurringDue } = useRecurring();
  const { targets } = useTargets();
  const { accounts, transfers } = useAccounts();

  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const customCategoryCount = categories.income.length + categories.expense.length;


  const [reloading, setReloading] = React.useState(false);
  const [installOpen, setInstallOpen] = React.useState(false);

  // An installed web app has no browser reload button or pull-to-refresh,
  // so this is the way to pick up a new version. Data lives in
  // localStorage, so it survives the reload. It starts over on the
  // homepage, like a fresh launch.
  function handleReload() {
    setReloading(true);
    window.location.replace("/");
  }

  const [resetting, setResetting] = React.useState(false);

  async function handleReset() {
    setResetting(true);
    // Synced data lives on the server: clear it there first, and stop if that
    // fails so the local copy isn't wiped while the account still has data.
    if (synced) {
      try {
        // Goals before anything else they might reference; the rest in parallel.
        await deleteAllGoalsAction();
        await Promise.all([
          deleteAllTransactionsAction(),
          deleteAllAccountsAction(),
          deleteAllCategoriesAction(),
          deleteAllTargetsAction(),
          deleteAllRecurringAction(),
        ]);
      } catch {
        toast.error("Couldn’t reach the server, so nothing was deleted. Try again.");
        setResetting(false);
        return;
      }
    }
    clearAllData();
    // Every provider holds its data in memory and only writes on change, so a
    // full reload is what guarantees nothing old is written back. Goal photos
    // live in IndexedDB, so wait for them to be cleared first.
    clearGoalImages()
      .catch(() => {})
      .finally(() => window.location.replace("/"));
  }

  return (
    <>
      <ExpandableSheet
        hint="Swipe up for more settings"
        previewDetails
        hero={
          <AppHero label="Settings" value={<AnimatedNumber value={transactions.length} />}>
            <p className="text-xs text-white/55">
              {transactions.length === 1 ? "entry" : "entries"}
              {synced ? ", synced to your account" : " stored on this device"}
            </p>
            <button
              type="button"
              onClick={() => setInstallOpen(true)}
              className="mt-5 flex h-10 items-center gap-2 rounded-full bg-white/12 pr-4 pl-3 text-sm text-white ring-1 ring-white/15 transition-[transform,background-color] hover:bg-white/20 active:scale-95"
            >
              <Smartphone className="size-4 text-white/70" />
              Install app
            </button>
          </AppHero>
        }
        peek={() => (
          // Sign-in first, then the accounts. (The old "Your data" counts
          // only linked to pages the bottom bar already reaches.)
          <div className="flex flex-col gap-10">
            <div className="flex flex-col gap-2">
              <AccountCard authEnabled={authEnabled} />
              <p className="px-1 text-xs leading-relaxed text-white/45">
                {synced
                  ? "Your data is synced to your Google account. Goal photos stay on this device for now."
                  : "Everything is kept in this browser only — nothing is uploaded."}
              </p>
            </div>
            <AccountsSection />
          </div>
        )}
        details={
          <>
            <SheetSection title="Recurring">
              <Card className="gap-0 py-1">
                <Link
                  href="/recurring"
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/4 active:bg-white/6"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/8">
                    <Repeat className="size-4 text-white" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-white/85">Recurring transactions</span>
                    <span className="block text-xs text-white/50">
                      {recurringRules.length === 0
                        ? "Rent, salary, bills — set them up once"
                        : `${recurringRules.length} ${recurringRules.length === 1 ? "rule" : "rules"}${recurringDue.length ? ` · ${recurringDue.length} due` : ""}`}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-white/50" />
                </Link>
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
              {/* Amber: clears your entries but keeps the account. Red is kept
                  for deleting the account itself, below. */}
              <div className="flex flex-col gap-4 rounded-3xl bg-amber-500/8 p-5 ring-1 ring-amber-400/15">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-300">
                    <Database className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">Reset all data</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-white/50">
                      Permanently deletes every transaction, custom category,
                      target, goal, account and transfer, and restores the
                      defaults. This can&apos;t be undone.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmOpen(true)}
                  className="flex h-12 items-center justify-center gap-2 rounded-full bg-amber-500/15 px-5 text-sm font-medium text-amber-200 ring-1 ring-amber-400/30 transition-colors hover:bg-amber-500/25 active:scale-[0.98]"
                >
                  <Trash2 className="size-4" />
                  Reset all data
                </button>
              </div>
              {/* Only for synced users: guests have no account to delete. */}
              {synced && <DeleteAccountBlock />}
            </SheetSection>
          </>
        }
      />

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset all data?</DialogTitle>
            <DialogDescription>
              This deletes {transactions.length}{" "}
              {transactions.length === 1 ? "transaction" : "transactions"},{" "}
              {customCategoryCount} custom{" "}
              {customCategoryCount === 1 ? "category" : "categories"},{" "}
              {targets.length} {targets.length === 1 ? "target" : "targets"},{" "}
              {goals.length} {goals.length === 1 ? "goal" : "goals"}
              {accounts.length > 1 &&
                `, ${accounts.length - 1} extra ${accounts.length === 2 ? "account" : "accounts"}`}
              {transfers.length > 0 &&
                ` and ${transfers.length} ${transfers.length === 1 ? "transfer" : "transfers"}`}
              . This can&apos;t be undone. Press and hold the button to confirm.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            {/* Hold, not a typed word: hard to trigger by accident, one gesture. */}
            <HoldButton
              tone="amber"
              onConfirm={handleReset}
              busy={resetting}
              busyLabel="Deleting…"
              icon={<Trash2 className="size-4" />}
            >
              Hold to delete everything
            </HoldButton>
            <DialogClose render={<Button variant="outline" size="lg" />}>
              Cancel
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InstallGuideDialog open={installOpen} onOpenChange={setInstallOpen} />
    </>
  );
}
