/**
 * The database schema (Neon Postgres, via Drizzle).
 *
 * Two parts:
 * - Auth tables (`user`, `session`, `account`, `verification`) in the exact
 *   shape Better Auth expects. Sign-in is Google only, so `account` holds
 *   the Google link and `password` stays empty.
 * - App tables, one per kind of data the app kept in localStorage. Every
 *   row belongs to a user (`user_id`, deleted with them) and keeps the id
 *   the client generated, so data imported from a phone keeps its ids and
 *   references (a transaction's account, a completion's goal) still line up.
 *
 * App timestamps are epoch milliseconds (`bigint`, read as numbers) to match
 * the client model one-to-one; money is `numeric(14,2)` read as numbers.
 * Column names are snake_case in the database (see `casing` in db/index.ts
 * and drizzle.config.ts) and camelCase in TypeScript.
 */
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Auth (Better Auth)                                                  */
/* ------------------------------------------------------------------ */

export const user = pgTable("user", {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean().notNull().default(false),
  image: text(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text().primaryKey(),
    expiresAt: timestamp().notNull(),
    token: text().notNull().unique(),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
    ipAddress: text(),
    userAgent: text(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text().primaryKey(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp(),
    refreshTokenExpiresAt: timestamp(),
    scope: text(),
    password: text(),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp().notNull(),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

/* ------------------------------------------------------------------ */
/* App data                                                            */
/* ------------------------------------------------------------------ */

const userId = () =>
  text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" });
const millis = () => bigint({ mode: "number" });
const money = () => numeric({ precision: 14, scale: 2, mode: "number" });

/** Income and expense entries — the ledger everything else is derived from. */
export const transactions = pgTable(
  "transactions",
  {
    id: text().primaryKey(),
    userId: userId(),
    type: text({ enum: ["income", "expense"] }).notNull(),
    /** The category label, as the client stores it. */
    category: text().notNull(),
    amount: money().notNull(),
    note: text(),
    /** Missing means the user's Cash account. */
    accountId: text(),
    createdAt: millis().notNull(),
  },
  (table) => [index("transactions_user_created_idx").on(table.userId, table.createdAt)],
);

/**
 * Where money sits. Keyed per user because the default Cash account has the
 * fixed id "cash" for everyone.
 */
export const accounts = pgTable(
  "accounts",
  {
    userId: userId(),
    id: text().notNull(),
    name: text().notNull(),
    kind: text({ enum: ["cash", "mobile", "bank", "card", "other"] }).notNull(),
    provider: text(),
    openingBalance: money().notNull().default(0),
    createdAt: millis().notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.id] })],
);

/** Money moved between accounts. Never counted as income or expense. */
export const transfers = pgTable(
  "transfers",
  {
    id: text().primaryKey(),
    userId: userId(),
    fromAccountId: text().notNull(),
    toAccountId: text().notNull(),
    amount: money().notNull(),
    note: text(),
    createdAt: millis().notNull(),
  },
  (table) => [index("transfers_user_idx").on(table.userId)],
);

/** User-made categories (the built-in ones live in code). */
export const customCategories = pgTable(
  "custom_categories",
  {
    id: text().primaryKey(),
    userId: userId(),
    /** Stable key used by visibility and targets; survives renames. */
    key: text().notNull(),
    type: text({ enum: ["income", "expense"] }).notNull(),
    label: text().notNull(),
    iconKey: text().notNull(),
    createdAt: millis().notNull(),
  },
  (table) => [index("custom_categories_user_idx").on(table.userId)],
);

/** Categories hidden from the entry screen, one row per hidden key. */
export const hiddenCategories = pgTable(
  "hidden_categories",
  {
    userId: userId(),
    type: text({ enum: ["income", "expense"] }).notNull(),
    categoryKey: text().notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.type, table.categoryKey] })],
);

/** Monthly spending caps per expense category. */
export const categoryTargets = pgTable(
  "category_targets",
  {
    userId: userId(),
    categoryKey: text().notNull(),
    categoryLabel: text().notNull(),
    amount: money().notNull(),
    /** Per-month values keyed by "YYYY-MM". */
    overrides: jsonb().$type<Record<string, number>>().notNull().default({}),
    createdAt: millis().notNull(),
    updatedAt: millis().notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.categoryKey] })],
);

/** Things the user is saving up for. */
export const goals = pgTable(
  "goals",
  {
    id: text().primaryKey(),
    userId: userId(),
    label: text().notNull(),
    targetAmount: money().notNull(),
    iconKey: text(),
    targetDate: millis(),
    links: jsonb().$type<string[]>(),
    /** Where the photo lives once photos move to blob storage. */
    imageUrl: text(),
    /**
     * The photo's id in the browser's IndexedDB (see lib/goal-images), until
     * photos move to blob storage. Only resolves on the device that added it.
     */
    imageId: text(),
    /** Lower is higher priority. */
    order: integer(),
    priceHistory: jsonb().$type<{ amount: number; changedAt: number }[]>(),
    status: text({ enum: ["active", "completed", "archived"] }).notNull().default("active"),
    createdAt: millis().notNull(),
    updatedAt: millis().notNull(),
  },
  (table) => [index("goals_user_idx").on(table.userId)],
);

/** How each completed goal was fulfilled. */
export const goalCompletions = pgTable(
  "goal_completions",
  {
    id: text().primaryKey(),
    userId: userId(),
    goalId: text()
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    source: text({ enum: ["savings", "gift"] }).notNull(),
    amount: money().notNull(),
    transactionId: text(),
    createdAt: millis().notNull(),
  },
  (table) => [index("goal_completions_user_idx").on(table.userId)],
);

/** Rent, salary, bills: rules that come up as due on a schedule. */
export const recurringRules = pgTable(
  "recurring_rules",
  {
    id: text().primaryKey(),
    userId: userId(),
    type: text({ enum: ["income", "expense"] }).notNull(),
    category: text().notNull(),
    amount: money().notNull(),
    frequency: text({ enum: ["monthly", "weekly", "yearly"] }).notNull(),
    dayOfMonth: integer().notNull(),
    startDate: millis().notNull(),
    note: text(),
    paused: boolean().notNull().default(false),
    settledThrough: text(),
    handled: jsonb().$type<string[]>().notNull().default([]),
    createdAt: millis().notNull(),
    updatedAt: millis().notNull(),
  },
  (table) => [index("recurring_rules_user_idx").on(table.userId)],
);

/** Small per-user settings (last account used, dismissed recap, …). */
export const userPreferences = pgTable("user_preferences", {
  userId: text()
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  lastAccountId: text(),
  recapDismissedMonth: text(),
  updatedAt: millis().notNull(),
});
