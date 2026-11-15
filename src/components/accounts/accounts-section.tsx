"use client";

import { ArrowLeftRight, ArrowRight, Plus, Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "@yusufceng1z/ding-react";

import { AccountDialog } from "@/components/accounts/account-dialog";
import { useAccounts } from "@/components/accounts/accounts-provider";
import { TransferDialog } from "@/components/accounts/transfer-dialog";
import { useTransactions } from "@/components/dashboard/transactions-provider";
import { RowIconButton, SheetButton, SheetSection } from "@/components/layout/app-shell";
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
import { AccountIcon, hasAccountLogo } from "@/components/accounts/account-icon";
import {
  DEFAULT_ACCOUNT_ID,
  getAccountKindLabel,
  resolveAccountId,
  type Account,
  type Transfer,
} from "@/lib/accounts";
import { formatCurrency } from "@/lib/transactions";
import { cn } from "@/lib/utils";

/** How many transfers to list under the accounts. */
const RECENT_TRANSFERS = 5;

function SignedAmount({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("tabular-nums", value < 0 && "text-rose-300", className)}>
      {value < 0 && "−"}
      {formatCurrency(value)}
    </span>
  );
}

/**
 * The Accounts block in Settings: each account with its balance (tap to
 * edit), add / transfer actions and the latest transfers.
 */
export function AccountsSection() {
  const {
    accounts,
    transfers,
    balances,
    hasMultipleAccounts,
    getAccount,
    addAccount,
    updateAccount,
    removeAccount,
    addTransfer,
    removeTransfer,
  } = useAccounts();
  const { transactions } = useTransactions();

  // Open state and target are separate so the dialog keeps its content
  // while it animates closed.
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editedAccount, setEditedAccount] = React.useState<Account | undefined>();
  const [transferOpen, setTransferOpen] = React.useState(false);
  const [deletingTransfer, setDeletingTransfer] = React.useState<Transfer | null>(null);
  // Bumped on every open so the dialogs start from fresh state.
  const [dialogKey, setDialogKey] = React.useState(0);

  const usage = React.useMemo(() => {
    if (!editedAccount) return { entries: 0, transfers: 0 };
    const known = new Set(accounts.map((a) => a.id));
    return {
      entries: transactions.filter(
        (t) => resolveAccountId(t.accountId, known) === editedAccount.id,
      ).length,
      transfers: transfers.filter(
        (t) => t.fromAccountId === editedAccount.id || t.toAccountId === editedAccount.id,
      ).length,
    };
  }, [editedAccount, accounts, transactions, transfers]);

  const existingNames = accounts
    .filter((a) => a.id !== editedAccount?.id)
    .map((a) => a.name.toLowerCase());

  const recentTransfers = React.useMemo(
    () =>
      [...transfers].sort((a, b) => b.createdAt - a.createdAt).slice(0, RECENT_TRANSFERS),
    [transfers],
  );

  function openEditor(next: Account | undefined) {
    setDialogKey((k) => k + 1);
    setEditedAccount(next);
    setEditorOpen(true);
  }

  return (
    <SheetSection
      title="Accounts"
      subtitle="Where your money is"
      action={
        <div className="flex items-center gap-1.5">
          {hasMultipleAccounts && (
            <SheetButton
              onClick={() => {
                setDialogKey((k) => k + 1);
                setTransferOpen(true);
              }}
            >
              <ArrowLeftRight />
              Transfer
            </SheetButton>
          )}
          <SheetButton onClick={() => openEditor(undefined)} aria-label="Add account">
            <Plus />
            Add
          </SheetButton>
        </div>
      }
    >
      <Card className="gap-0 py-1">
        {accounts.map((account, index) => (
          <button
            key={account.id}
            type="button"
            onClick={() => openEditor(account)}
            className={cn(
              "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/4 active:bg-white/6",
              index !== accounts.length - 1 && "border-b border-white/6",
            )}
          >
            {hasAccountLogo(account) ? (
              <AccountIcon account={account} className="size-10" />
            ) : (
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/8">
                <AccountIcon account={account} className="size-4 text-white" />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-white/85">{account.name}</span>
              <span className="block text-xs text-white/50">
                {account.id === DEFAULT_ACCOUNT_ID
                  ? "Default"
                  : getAccountKindLabel(account.kind)}
              </span>
            </span>
            <SignedAmount
              value={balances[account.id] ?? 0}
              className="text-sm font-medium text-white"
            />
          </button>
        ))}
      </Card>

      {!hasMultipleAccounts && (
        <p className="px-1 text-xs leading-relaxed text-white/45">
          Add bKash, Nagad or a bank account to see each balance and pick the
          account when you log an entry.
        </p>
      )}

      {recentTransfers.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="px-1 text-xs font-medium text-white/50">Recent transfers</p>
          <Card className="gap-0 py-1">
            {recentTransfers.map((transfer, index) => (
              <div
                key={transfer.id}
                className={cn(
                  "flex items-center gap-3 py-2.5 pr-2 pl-4",
                  index !== recentTransfers.length - 1 && "border-b border-white/6",
                )}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/8">
                  <ArrowLeftRight className="size-4 text-white/80" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 truncate text-sm text-white/85">
                    <span className="truncate">{getAccount(transfer.fromAccountId).name}</span>
                    <ArrowRight className="size-3 shrink-0 text-white/40" />
                    <span className="truncate">{getAccount(transfer.toAccountId).name}</span>
                  </span>
                  <span className="block truncate text-xs text-white/50">
                    {new Date(transfer.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                    {transfer.note && ` · ${transfer.note}`}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-medium tabular-nums text-white">
                  {formatCurrency(transfer.amount)}
                </span>
                <RowIconButton
                  aria-label="Delete transfer"
                  onClick={() => setDeletingTransfer(transfer)}
                >
                  <Trash2 />
                </RowIconButton>
              </div>
            ))}
          </Card>
        </div>
      )}

      <AccountDialog
        key={`account-${dialogKey}`}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        initial={editedAccount}
        entryCount={usage.entries}
        transferCount={usage.transfers}
        existingNames={existingNames}
        onSubmit={(input) => {
          if (editedAccount) {
            updateAccount(editedAccount.id, input);
            toast.success("Account updated");
          } else {
            addAccount(input);
            toast.success(`Added ${input.name}`);
          }
        }}
        onDelete={
          editedAccount
            ? () => {
                removeAccount(editedAccount.id);
                toast.success(`Deleted ${editedAccount.name}`);
              }
            : undefined
        }
      />

      {hasMultipleAccounts && (
        <TransferDialog
          key={`transfer-${dialogKey}`}
          open={transferOpen}
          onOpenChange={setTransferOpen}
          accounts={accounts}
          balances={balances}
          onSubmit={(input) => {
            addTransfer(input);
            toast.success(
              `Moved ${formatCurrency(input.amount)} to ${getAccount(input.toAccountId).name}`,
            );
          }}
        />
      )}

      <Dialog
        open={deletingTransfer !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingTransfer(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete transfer?</DialogTitle>
            <DialogDescription>
              {deletingTransfer &&
                `${formatCurrency(deletingTransfer.amount)} from ${getAccount(deletingTransfer.fromAccountId).name} to ${getAccount(deletingTransfer.toAccountId).name}. Both balances go back to how they were.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row">
            <Button
              variant="destructive"
              size="lg"
              onClick={() => {
                if (deletingTransfer) removeTransfer(deletingTransfer.id);
                setDeletingTransfer(null);
                toast.success("Transfer deleted");
              }}
            >
              <Trash2 />
              Delete
            </Button>
            <DialogClose render={<Button variant="outline" size="lg" />}>Cancel</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SheetSection>
  );
}
