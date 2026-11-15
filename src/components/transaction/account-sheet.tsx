"use client";

import { Check } from "lucide-react";
import * as React from "react";

import { LightSheet } from "@/components/transaction/light-sheet";
import { AccountIcon, hasAccountLogo } from "@/components/accounts/account-icon";
import type { Account } from "@/lib/accounts";
import { formatCurrency } from "@/lib/transactions";
import { cn } from "@/lib/utils";

/** Picks which account an entry on the white entry screen goes through. */
export function AccountSheet({
  open,
  onOpenChange,
  accounts,
  balances,
  selectedId,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Account[];
  balances: Record<string, number>;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <LightSheet open={open} onOpenChange={onOpenChange} title="account">
      <div className="flex flex-col gap-2 overflow-y-auto px-6">
        {accounts.map((account) => {
          const isSelected = account.id === selectedId;
          const balance = balances[account.id] ?? 0;
          return (
            <button
              key={account.id}
              type="button"
              onClick={() => onSelect(account.id)}
              aria-pressed={isSelected}
              className={cn(
                "flex min-w-0 items-center gap-3 rounded-full p-1.5 pr-4 text-left text-sm transition-colors active:scale-[0.98]",
                isSelected
                  ? "bg-black text-white"
                  : "bg-neutral-100 text-neutral-900 hover:bg-neutral-200/70",
              )}
            >
              {hasAccountLogo(account) ? (
                <AccountIcon account={account} className="size-9" />
              ) : (
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full",
                    isSelected ? "bg-white/15" : "bg-black text-white",
                  )}
                >
                  <AccountIcon account={account} className="size-4" />
                </span>
              )}
              <span className="min-w-0 flex-1 truncate">{account.name}</span>
              <span
                className={cn(
                  "shrink-0 text-xs tabular-nums",
                  isSelected ? "text-white/70" : balance < 0 ? "text-rose-600" : "text-neutral-500",
                )}
              >
                {balance < 0 && "−"}
                {formatCurrency(balance)}
              </span>
              {isSelected && <Check className="size-4 shrink-0" />}
            </button>
          );
        })}
      </div>
    </LightSheet>
  );
}
