"use client";

import { PenLine, Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "@yusufceng1z/ding-react";

import { ProviderLogo } from "@/components/accounts/account-icon";
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
import type { AccountInput } from "@/hooks/use-accounts";
import {
  ACCOUNT_KINDS,
  ACCOUNT_PROVIDERS,
  getAccountProvider,
  type AccountProviderId,
  DEFAULT_ACCOUNT_ID,
  MAX_ACCOUNT_NAME_LENGTH,
  type Account,
  type AccountKind,
} from "@/lib/accounts";
import { cn } from "@/lib/utils";

/**
 * Add or edit an account: a name, what kind it is (only sets the icon) and
 * the money already in it. Editing also offers delete, which explains that
 * the account's entries move to Cash rather than vanish.
 */
export function AccountDialog({
  open,
  onOpenChange,
  initial,
  entryCount = 0,
  transferCount = 0,
  existingNames,
  onSubmit,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The account being edited; omit to create one. */
  initial?: Account;
  /** How many transactions / transfers use the edited account. */
  entryCount?: number;
  transferCount?: number;
  /** Lower-cased names of the other accounts, to prevent duplicates. */
  existingNames: string[];
  onSubmit: (input: AccountInput) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = React.useState(initial?.name ?? "");
  const [kind, setKind] = React.useState<AccountKind>(initial?.kind ?? "mobile");
  /** The picked provider; undefined means a custom account with a kind icon. */
  const [provider, setProvider] = React.useState<AccountProviderId | undefined>(() =>
    initial ? getAccountProvider(initial)?.id : undefined,
  );

  function pickProvider(next: AccountProviderId | undefined) {
    const previous = ACCOUNT_PROVIDERS.find((p) => p.id === provider);
    const chosen = ACCOUNT_PROVIDERS.find((p) => p.id === next);
    setProvider(next);
    if (chosen) setKind(chosen.kind);
    // Fill the name from the provider unless the user typed their own
    // (e.g. "bKash personal"), which is kept.
    if (chosen && (!name.trim() || name.trim() === previous?.name)) setName(chosen.name);
    if (!chosen && previous && name.trim() === previous.name) setName("");
  }
  const [opening, setOpening] = React.useState(
    initial?.openingBalance ? String(initial.openingBalance) : "",
  );
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);

  const isCash = initial?.id === DEFAULT_ACCOUNT_ID;

  function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Enter an account name");
      return;
    }
    if (existingNames.includes(trimmed.toLowerCase())) {
      toast.error(`You already have “${trimmed}”`);
      return;
    }
    const value = opening.trim() === "" ? 0 : Number(opening);
    if (!Number.isFinite(value) || value < 0) {
      toast.error("Enter a valid opening balance");
      return;
    }
    onSubmit({ name: trimmed, kind, provider, openingBalance: value });
    onOpenChange(false);
  }

  if (confirmingDelete && initial) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {initial.name}?</DialogTitle>
            <DialogDescription>
              {entryCount > 0
                ? `Its ${entryCount} ${entryCount === 1 ? "entry moves" : "entries move"} to Cash, so your income and spending totals stay the same.`
                : "It has no entries."}
              {transferCount > 0 &&
                ` ${transferCount} ${transferCount === 1 ? "transfer" : "transfers"} to or from it will be removed.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row">
            <Button
              variant="destructive"
              size="lg"
              onClick={() => {
                onDelete?.();
                onOpenChange(false);
              }}
            >
              <Trash2 />
              Delete account
            </Button>
            <Button variant="outline" size="lg" onClick={() => setConfirmingDelete(false)}>
              Keep it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit account" : "New account"}</DialogTitle>
          <DialogDescription>Somewhere your money sits, like bKash or a bank.</DialogDescription>
        </DialogHeader>

        <div className="flex min-w-0 flex-col gap-4">
          {/* Known providers show their real logo; "Custom" falls back to
              a kind icon. The Cash account keeps its own icon. */}
          {!isCash && (
            <div
              role="radiogroup"
              aria-label="Provider"
              className="grid grid-cols-5 gap-x-1 gap-y-3 rounded-3xl bg-white/4 p-3"
            >
              {ACCOUNT_PROVIDERS.map((option) => {
                const selected = provider === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={option.name}
                    onClick={() => pickProvider(option.id)}
                    className="flex min-w-0 flex-col items-center gap-1.5 active:scale-95"
                  >
                    <ProviderLogo
                      provider={option}
                      className={cn(
                        "size-11 ring-offset-2 ring-offset-[#141518] transition-shadow",
                        selected ? "ring-2 ring-white" : "ring-0",
                      )}
                    />
                    <span
                      className={cn(
                        "w-full truncate text-center text-[10px] leading-tight",
                        selected ? "text-white" : "text-white/50",
                      )}
                    >
                      {option.name}
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                role="radio"
                aria-checked={provider === undefined}
                aria-label="Custom account"
                onClick={() => pickProvider(undefined)}
                className="flex min-w-0 flex-col items-center gap-1.5 active:scale-95"
              >
                <span
                  className={cn(
                    "flex size-11 items-center justify-center rounded-full bg-white/8 text-white/80 ring-offset-2 ring-offset-[#141518] transition-shadow",
                    provider === undefined ? "ring-2 ring-white" : "ring-0",
                  )}
                >
                  <PenLine className="size-4" />
                </span>
                <span
                  className={cn(
                    "w-full truncate text-center text-[10px] leading-tight",
                    provider === undefined ? "text-white" : "text-white/50",
                  )}
                >
                  Custom
                </span>
              </button>
            </div>
          )}

          <Input
            value={name}
            maxLength={MAX_ACCOUNT_NAME_LENGTH}
            placeholder="Name, e.g. bKash"
            aria-label="Account name"
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleSubmit();
            }}
          />

          {/* Kind only picks the icon, so it's only asked for custom accounts. */}
          {!isCash && provider === undefined && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Account type">
              {ACCOUNT_KINDS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setKind(option.value)}
                  aria-pressed={kind === option.value}
                  className={cn(
                    "flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm transition-colors active:scale-95",
                    kind === option.value
                      ? "bg-white text-black"
                      : "bg-white/6 text-white/75 hover:bg-white/10",
                  )}
                >
                  <option.icon className="size-4" />
                  {option.label}
                </button>
              ))}
            </div>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="px-1 text-xs text-white/50">
              Opening balance — what was in it before you started tracking
            </span>
            <Input
              value={opening}
              inputMode="decimal"
              placeholder="৳0"
              aria-label="Opening balance"
              className="tabular-nums"
              onChange={(event) => setOpening(event.target.value.replace(/[^0-9.]/g, ""))}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSubmit();
              }}
            />
          </label>
        </div>

        <DialogFooter className="flex-col sm:flex-row">
          <Button size="lg" onClick={handleSubmit}>
            {initial ? "Save changes" : "Add account"}
          </Button>
          {initial && !isCash && onDelete ? (
            <Button variant="destructive" size="lg" onClick={() => setConfirmingDelete(true)}>
              <Trash2 />
              Delete
            </Button>
          ) : (
            <DialogClose render={<Button variant="outline" size="lg" />}>Cancel</DialogClose>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
