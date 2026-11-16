"use client";

import Link from "next/link";

import { AccountIcon, hasAccountLogo } from "@/components/accounts/account-icon";
import { useAccounts } from "@/components/accounts/accounts-provider";
import { formatCurrency } from "@/lib/transactions";
import { cn } from "@/lib/utils";

/**
 * Where the money is right now: one chip per account (logo, name, balance)
 * in a row that scrolls sideways. Shown only once there's more than one
 * account — with just Cash it would repeat the savings figure. Tapping a
 * chip opens Settings, where accounts and transfers are managed.
 */
export function AccountBalances() {
  const { accounts, balances, hasMultipleAccounts } = useAccounts();
  if (!hasMultipleAccounts) return null;

  const total = accounts.reduce((sum, account) => sum + (balances[account.id] ?? 0), 0);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h2 className="text-sm font-semibold text-white">Accounts</h2>
        <p className="text-xs tabular-nums text-white/50">
          {total < 0 && "−"}
          {formatCurrency(total)} in total
        </p>
      </div>

      <div
        className="-mx-5 overflow-x-auto px-5 [-ms-overflow-style:none] [scrollbar-width:none] sm:-mx-8 sm:px-8 [&::-webkit-scrollbar]:hidden"
        role="list"
        aria-label="Account balances"
      >
        <div className="flex w-max gap-2">
          {accounts.map((account) => {
            const balance = balances[account.id] ?? 0;
            return (
              <Link
                key={account.id}
                href="/settings"
                role="listitem"
                className="flex items-center gap-2.5 rounded-2xl bg-white/6 py-2.5 pr-4 pl-2.5 transition-colors hover:bg-white/9 active:scale-[0.98]"
              >
                {hasAccountLogo(account) ? (
                  <AccountIcon account={account} className="size-8" />
                ) : (
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/8 text-white/80">
                    <AccountIcon account={account} className="size-4" />
                  </span>
                )}
                <span className="flex flex-col">
                  <span className="max-w-28 truncate text-xs text-white/55">{account.name}</span>
                  <span
                    className={cn(
                      "text-sm font-medium tabular-nums",
                      balance < 0 ? "text-rose-300" : "text-white",
                    )}
                  >
                    {balance < 0 && "−"}
                    {formatCurrency(balance)}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
