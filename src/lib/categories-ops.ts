import { CATEGORY_ICONS, DEFAULT_CATEGORY_ICON } from "@/lib/category-icons";
import { createId } from "@/lib/id";
import type { CustomCategory, TransactionType } from "@/lib/transactions";

/*
 * Pure category operations shared by the browser-storage and the database
 * stores, so both produce identical results for the same change.
 */

export type CustomCategories = Record<TransactionType, CustomCategory[]>;
export type HiddenCategories = Record<TransactionType, string[]>;

export interface NewCustomCategory {
  type: TransactionType;
  label: string;
  iconKey: string;
}

export interface CustomCategoryPatch {
  label?: string;
  iconKey?: string;
  type?: TransactionType;
}

export const EMPTY_CUSTOM_CATEGORIES: CustomCategories = { income: [], expense: [] };
export const EMPTY_HIDDEN_CATEGORIES: HiddenCategories = { income: [], expense: [] };

export function isTransactionType(value: unknown): value is TransactionType {
  return value === "income" || value === "expense";
}

/**
 * A known icon key, else the default. `hasOwn` rather than `in`, so keys
 * like "toString" from the prototype don't count as icons.
 */
export function normalizeIconKey(key: unknown) {
  return typeof key === "string" && Object.hasOwn(CATEGORY_ICONS, key)
    ? key
    : DEFAULT_CATEGORY_ICON;
}

/**
 * localStorage is user editable and survives app upgrades, so anything read
 * back has to be validated before it reaches the rest of the app.
 */
function sanitizeList(list: unknown): CustomCategory[] {
  if (!Array.isArray(list)) return [];

  return list
    .filter(
      (entry): entry is CustomCategory =>
        !!entry &&
        typeof entry === "object" &&
        typeof (entry as CustomCategory).id === "string" &&
        typeof (entry as CustomCategory).key === "string" &&
        isTransactionType((entry as CustomCategory).type) &&
        typeof (entry as CustomCategory).label === "string" &&
        (entry as CustomCategory).label.trim().length > 0,
    )
    .map((entry) => ({
      ...entry,
      label: entry.label.trim(),
      iconKey: normalizeIconKey(entry.iconKey),
    }));
}

export function sanitizeCustomCategories(parsed: unknown): CustomCategories {
  if (!parsed || typeof parsed !== "object") return EMPTY_CUSTOM_CATEGORIES;
  const value = parsed as Partial<CustomCategories>;
  return {
    income: sanitizeList(value.income),
    expense: sanitizeList(value.expense),
  };
}

export function sanitizeHiddenCategories(parsed: unknown): HiddenCategories {
  if (!parsed || typeof parsed !== "object") return EMPTY_HIDDEN_CATEGORIES;
  const value = parsed as Partial<Record<TransactionType, unknown>>;
  const list = (raw: unknown) =>
    Array.isArray(raw) ? raw.filter((k): k is string => typeof k === "string") : [];
  return { income: list(value.income), expense: list(value.expense) };
}

/** A new custom category with a client-generated id and a key derived from it. */
export function createCustomCategory({ type, label, iconKey }: NewCustomCategory): CustomCategory {
  const id = createId();
  return {
    id,
    key: `custom-${id}`,
    type,
    label: label.trim(),
    iconKey: normalizeIconKey(iconKey),
    createdAt: Date.now(),
  };
}

export function addCustomCategory(
  prev: CustomCategories,
  category: CustomCategory,
): CustomCategories {
  return { ...prev, [category.type]: [...prev[category.type], category] };
}

/** Trims the label and validates the icon, so the store and server agree. */
export function normalizeCategoryPatch(patch: CustomCategoryPatch): CustomCategoryPatch {
  const next: CustomCategoryPatch = {};
  if (patch.label !== undefined) next.label = patch.label.trim();
  if (patch.iconKey !== undefined) next.iconKey = normalizeIconKey(patch.iconKey);
  if (patch.type !== undefined) next.type = patch.type;
  return next;
}

/** Updates a custom category; a type change moves it to the other list's end. */
export function applyCategoryPatch(
  prev: CustomCategories,
  id: string,
  patch: CustomCategoryPatch,
): CustomCategories {
  const next: CustomCategories = {
    income: [...prev.income],
    expense: [...prev.expense],
  };

  for (const bucket of ["income", "expense"] as const) {
    const index = next[bucket].findIndex((c) => c.id === id);
    if (index === -1) continue;

    const existing = next[bucket][index];
    const updated: CustomCategory = {
      ...existing,
      ...(patch.label !== undefined ? { label: patch.label } : {}),
      ...(patch.iconKey !== undefined ? { iconKey: patch.iconKey } : {}),
    };

    if (patch.type && patch.type !== existing.type) {
      next[bucket].splice(index, 1);
      next[patch.type].push({ ...updated, type: patch.type });
    } else {
      next[bucket].splice(index, 1, updated);
    }
  }

  return next;
}

export function removeCustomCategory(prev: CustomCategories, id: string): CustomCategories {
  return {
    income: prev.income.filter((c) => c.id !== id),
    expense: prev.expense.filter((c) => c.id !== id),
  };
}

export function isCategoryHidden(hidden: HiddenCategories, type: TransactionType, key: string) {
  return hidden[type].includes(key);
}

/** Shows or hides one category on the entry screen. */
export function setCategoryHidden(
  prev: HiddenCategories,
  type: TransactionType,
  key: string,
  isHidden: boolean,
): HiddenCategories {
  const set = new Set(prev[type]);
  if (isHidden) set.add(key);
  else set.delete(key);
  return { ...prev, [type]: Array.from(set) };
}
