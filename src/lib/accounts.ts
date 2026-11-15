import {
  Banknote,
  CreditCard,
  Landmark,
  Smartphone,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import type { Transaction } from "@/lib/transactions";

/**
 * Accounts track *where* money sits (cash in hand, bKash, a bank account).
 * They are a layer on top of the ledger: a transaction without an
 * `accountId` belongs to the default Cash account, so data saved before
 * accounts existed keeps working unchanged.
 */

export const ACCOUNTS_STORAGE_KEY = "expense-tracker:accounts";

/**
 * Transfers live under their own key rather than in the transaction list, so
 * moving money between accounts can never be counted as income or expense —
 * totals, savings and targets only ever read transactions.
 */
export const TRANSFERS_STORAGE_KEY = "expense-tracker:transfers";

/** The account the entry screen picks by default for the next entry. */
export const LAST_ACCOUNT_STORAGE_KEY = "expense-tracker:last-account";

/** The built-in Cash account. Its id is fixed so old entries can point at it implicitly. */
export const DEFAULT_ACCOUNT_ID = "cash";

export type AccountKind = "cash" | "mobile" | "bank" | "card" | "other";

export interface Account {
  id: string;
  name: string;
  kind: AccountKind;
  /** A known provider (bKash, BRAC Bank, …), which gives it a real logo. */
  provider?: AccountProviderId;
  /** Money already in the account before the first tracked entry. */
  openingBalance: number;
  createdAt: number;
}

export interface Transfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  createdAt: number;
  note?: string;
}

export const ACCOUNT_KINDS: { value: AccountKind; label: string; icon: LucideIcon }[] = [
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "mobile", label: "Mobile wallet", icon: Smartphone },
  { value: "bank", label: "Bank", icon: Landmark },
  { value: "card", label: "Card", icon: CreditCard },
  { value: "other", label: "Other", icon: Wallet },
];

/**
 * Known wallets, banks and card networks, each with its real logo (in
 * public/account-logos). Wallet and bank logos are their official app icons,
 * so they fill a round tile; card and some bank logos are wordmarks, shown
 * contained on white.
 */
export const ACCOUNT_PROVIDERS = [
  { id: "bkash", name: "bKash", kind: "mobile", logo: "/account-logos/bkash.png", fit: "cover" },
  { id: "nagad", name: "Nagad", kind: "mobile", logo: "/account-logos/nagad.png", fit: "cover" },
  { id: "rocket", name: "Rocket", kind: "mobile", logo: "/account-logos/rocket.png", fit: "cover" },
  { id: "upay", name: "Upay", kind: "mobile", logo: "/account-logos/upay.png", fit: "cover" },
  { id: "brac", name: "BRAC Bank", kind: "bank", logo: "/account-logos/brac.png", fit: "cover" },
  { id: "city", name: "City Bank", kind: "bank", logo: "/account-logos/city.png", fit: "cover" },
  { id: "dbbl", name: "Dutch-Bangla Bank", kind: "bank", logo: "/account-logos/dbbl.svg", fit: "contain" },
  { id: "ebl", name: "Eastern Bank", kind: "bank", logo: "/account-logos/ebl.png", fit: "cover" },
  { id: "mtb", name: "Mutual Trust Bank", kind: "bank", logo: "/account-logos/mtb.png", fit: "cover" },
  { id: "scb", name: "Standard Chartered", kind: "bank", logo: "/account-logos/scb.png", fit: "cover" },
  { id: "sonali", name: "Sonali Bank", kind: "bank", logo: "/account-logos/sonali.svg", fit: "contain" },
  { id: "visa", name: "Visa", kind: "card", logo: "/account-logos/visa.svg", fit: "contain" },
  { id: "mastercard", name: "Mastercard", kind: "card", logo: "/account-logos/mastercard.svg", fit: "contain" },
] as const satisfies readonly {
  id: string;
  name: string;
  kind: AccountKind;
  logo: string;
  fit: "cover" | "contain";
}[];

export type AccountProvider = (typeof ACCOUNT_PROVIDERS)[number];
export type AccountProviderId = AccountProvider["id"];

const PROVIDER_IDS = new Set<string>(ACCOUNT_PROVIDERS.map((p) => p.id));

/** Extra names people type for a provider, so "DBBL" or "SCB" still match. */
const PROVIDER_ALIASES: Record<string, AccountProviderId> = {
  "dutch bangla": "dbbl",
  "dutch-bangla": "dbbl",
  dbbl: "dbbl",
  ebl: "ebl",
  mtb: "mtb",
  scb: "scb",
  "standard chartered": "scb",
  brac: "brac",
  "city bank": "city",
  sonali: "sonali",
  "master card": "mastercard",
};

/**
 * The account's provider: the one it was saved with, or — for accounts
 * made before providers existed — one recognised from its name, so an old
 * "bKash" account picks up the logo too.
 */
export function getAccountProvider(
  account: Pick<Account, "provider" | "name" | "id">,
): AccountProvider | undefined {
  if (account.id === DEFAULT_ACCOUNT_ID) return undefined;
  if (account.provider) return ACCOUNT_PROVIDERS.find((p) => p.id === account.provider);
  const name = account.name.trim().toLowerCase();
  const byName = ACCOUNT_PROVIDERS.find((p) => p.name.toLowerCase() === name || p.id === name);
  if (byName) return byName;
  const alias = Object.keys(PROVIDER_ALIASES).find((key) => name.includes(key));
  return alias ? ACCOUNT_PROVIDERS.find((p) => p.id === PROVIDER_ALIASES[alias]) : undefined;
}

export const MAX_ACCOUNT_NAME_LENGTH = 24;
export const MAX_NOTE_LENGTH = 80;

export const DEFAULT_ACCOUNT: Account = {
  id: DEFAULT_ACCOUNT_ID,
  name: "Cash",
  kind: "cash",
  openingBalance: 0,
  createdAt: 0,
};

export function getAccountIcon(kind: AccountKind | undefined): LucideIcon {
  return ACCOUNT_KINDS.find((k) => k.value === kind)?.icon ?? Wallet;
}

export function getAccountKindLabel(kind: AccountKind | undefined) {
  return ACCOUNT_KINDS.find((k) => k.value === kind)?.label ?? "Other";
}

/** Trims a note and drops it when empty, so "" is never stored. */
export function normalizeNote(note: string | undefined | null) {
  const trimmed = note?.trim().slice(0, MAX_NOTE_LENGTH);
  return trimmed ? trimmed : undefined;
}

/**
 * The account an entry belongs to. Missing ids (old data) and ids of
 * accounts that no longer exist both resolve to Cash, so money never
 * disappears from the balances.
 */
export function resolveAccountId(
  accountId: string | undefined,
  knownIds?: ReadonlySet<string>,
) {
  if (!accountId) return DEFAULT_ACCOUNT_ID;
  if (knownIds && !knownIds.has(accountId)) return DEFAULT_ACCOUNT_ID;
  return accountId;
}

const KINDS = new Set<string>(ACCOUNT_KINDS.map((k) => k.value));

function sanitizeAccounts(parsed: unknown): Account[] {
  const accounts: Account[] = [];
  const seen = new Set<string>();
  if (Array.isArray(parsed)) {
    for (const entry of parsed) {
      if (!entry || typeof entry !== "object") continue;
      const value = entry as Partial<Account>;
      if (typeof value.id !== "string" || !value.id || seen.has(value.id)) continue;
      if (typeof value.name !== "string" || !value.name.trim()) continue;
      seen.add(value.id);
      accounts.push({
        id: value.id,
        name: value.name.trim(),
        kind: typeof value.kind === "string" && KINDS.has(value.kind) ? value.kind : "other",
        provider:
          typeof value.provider === "string" && PROVIDER_IDS.has(value.provider)
            ? value.provider
            : undefined,
        openingBalance:
          typeof value.openingBalance === "number" && Number.isFinite(value.openingBalance)
            ? value.openingBalance
            : 0,
        createdAt: typeof value.createdAt === "number" ? value.createdAt : 0,
      });
    }
  }
  // Cash always exists and always comes first: it is where unassigned
  // entries land, so it can't be lost to a bad write.
  const cashIndex = accounts.findIndex((a) => a.id === DEFAULT_ACCOUNT_ID);
  const cash = cashIndex === -1 ? DEFAULT_ACCOUNT : accounts.splice(cashIndex, 1)[0];
  return [cash, ...accounts];
}

function sanitizeTransfers(parsed: unknown): Transfer[] {
  if (!Array.isArray(parsed)) return [];
  const transfers: Transfer[] = [];
  for (const entry of parsed) {
    if (!entry || typeof entry !== "object") continue;
    const value = entry as Partial<Transfer>;
    if (typeof value.id !== "string" || !value.id) continue;
    if (typeof value.fromAccountId !== "string" || typeof value.toAccountId !== "string") continue;
    if (value.fromAccountId === value.toAccountId) continue;
    if (typeof value.amount !== "number" || !Number.isFinite(value.amount) || value.amount <= 0) {
      continue;
    }
    transfers.push({
      id: value.id,
      fromAccountId: value.fromAccountId,
      toAccountId: value.toAccountId,
      amount: value.amount,
      createdAt: typeof value.createdAt === "number" ? value.createdAt : Date.now(),
      note: normalizeNote(typeof value.note === "string" ? value.note : undefined),
    });
  }
  return transfers;
}

export function parseAccounts(raw: string) {
  try {
    return sanitizeAccounts(JSON.parse(raw));
  } catch {
    return sanitizeAccounts(null);
  }
}

export function parseTransfers(raw: string) {
  try {
    return sanitizeTransfers(JSON.parse(raw));
  } catch {
    return [];
  }
}

/**
 * Balance per account id:
 * opening balance + income − expense + transfers in − transfers out.
 */
export function computeAccountBalances(
  accounts: Account[],
  transactions: Transaction[],
  transfers: Transfer[],
) {
  const known = new Set(accounts.map((a) => a.id));
  const balances: Record<string, number> = {};
  for (const account of accounts) balances[account.id] = account.openingBalance;

  for (const t of transactions) {
    const id = resolveAccountId(t.accountId, known);
    balances[id] += t.type === "income" ? t.amount : -t.amount;
  }
  for (const transfer of transfers) {
    balances[resolveAccountId(transfer.fromAccountId, known)] -= transfer.amount;
    balances[resolveAccountId(transfer.toAccountId, known)] += transfer.amount;
  }
  return balances;
}
