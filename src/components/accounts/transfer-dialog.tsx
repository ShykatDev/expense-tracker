"use client";

import { ArrowDown } from "lucide-react";
import * as React from "react";
import { toast } from "@yusufceng1z/ding-react";

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
import type { TransferInput } from "@/hooks/use-accounts";
import { AccountIcon } from "@/components/accounts/account-icon";
import { MAX_NOTE_LENGTH, type Account } from "@/lib/accounts";
import { formatCurrency } from "@/lib/transactions";
import { cn } from "@/lib/utils";

/** A date as "YYYY-MM-DD" in local time (toISOString would use UTC). */
function toLocalDateInput(time: number) {
  const date = new Date(time);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** The picked day at the current time of day, so same-day transfers keep their order. */
function fromLocalDateInput(value: string) {
  const day = new Date(`${value}T00:00:00`);
  const now = new Date();
  day.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
  return day.getTime();
}

function AccountChips({
  label,
  accounts,
  balances,
  value,
  disabledId,
  onChange,
}: {
  label: string;
  accounts: Account[];
  balances: Record<string, number>;
  value: string;
  disabledId?: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="px-1 text-xs text-white/50">{label}</span>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
        {accounts.map((account) => {
          const selected = account.id === value;
          return (
            <button
              key={account.id}
              type="button"
              disabled={account.id === disabledId}
              onClick={() => onChange(account.id)}
              aria-pressed={selected}
              className={cn(
                "flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm [&:has(img)]:pl-3.5 transition-colors active:scale-95 disabled:opacity-30",
                selected ? "bg-white text-black" : "bg-white/6 text-white/75 hover:bg-white/10",
              )}
            >
              <AccountIcon account={account} className="-ml-2 size-6" iconClassName="size-4" />
              <span className="max-w-28 truncate">{account.name}</span>
              <span
                className={cn(
                  "text-xs tabular-nums",
                  selected ? "text-black/50" : "text-white/40",
                )}
              >
                {(balances[account.id] ?? 0) < 0 && "−"}
                {formatCurrency(balances[account.id] ?? 0)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Moves money between two accounts. A transfer only shifts balances; it is
 * never income or expense, so totals and savings don't move.
 */
export function TransferDialog({
  open,
  onOpenChange,
  accounts,
  balances,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Account[];
  balances: Record<string, number>;
  onSubmit: (input: TransferInput) => void;
}) {
  const [fromId, setFromId] = React.useState(accounts[0]?.id ?? "");
  const [toId, setToId] = React.useState(accounts[1]?.id ?? "");
  const [amount, setAmount] = React.useState("");
  const [today] = React.useState(() => toLocalDateInput(Date.now()));
  const [date, setDate] = React.useState(today);
  const [note, setNote] = React.useState("");

  function handleFrom(id: string) {
    setFromId(id);
    // Picking the current destination as the source swaps the two.
    if (id === toId) setToId(fromId);
  }

  function handleSubmit() {
    if (!fromId || !toId || fromId === toId) {
      toast.error("Pick two different accounts");
      return;
    }
    const value = Number(amount);
    if (!amount.trim() || !Number.isFinite(value) || value <= 0) {
      toast.error("Enter an amount");
      return;
    }
    onSubmit({
      fromAccountId: fromId,
      toAccountId: toId,
      amount: value,
      createdAt: date && date !== today ? fromLocalDateInput(date) : Date.now(),
      note,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer</DialogTitle>
          <DialogDescription>
            Move money between accounts. It isn’t counted as income or spending.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-w-0 flex-col gap-4">
          <AccountChips
            label="From"
            accounts={accounts}
            balances={balances}
            value={fromId}
            onChange={handleFrom}
          />
          <ArrowDown className="mx-auto size-4 text-white/40" aria-hidden />
          <AccountChips
            label="To"
            accounts={accounts}
            balances={balances}
            value={toId}
            disabledId={fromId}
            onChange={setToId}
          />

          <Input
            value={amount}
            inputMode="decimal"
            placeholder="Amount, ৳"
            aria-label="Amount"
            className="text-lg tabular-nums"
            onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, ""))}
          />

          <div className="grid grid-cols-[auto_1fr] gap-2">
            <Input
              type="date"
              value={date}
              max={today}
              aria-label="Date"
              onChange={(event) => setDate(event.target.value)}
              className="w-auto [color-scheme:dark]"
            />
            <Input
              value={note}
              maxLength={MAX_NOTE_LENGTH}
              placeholder="Note (optional)"
              aria-label="Note"
              onChange={(event) => setNote(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSubmit();
              }}
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row">
          <Button size="lg" onClick={handleSubmit}>
            Transfer
          </Button>
          <DialogClose render={<Button variant="outline" size="lg" />}>Cancel</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
