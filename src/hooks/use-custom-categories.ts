"use client";

import * as React from "react";

import {
  DEFAULT_CATEGORY_ICON,
  isCategoryIconKey,
} from "@/lib/category-icons";
import {
  CUSTOM_CATEGORIES_STORAGE_KEY,
  type CustomCategory,
  type TransactionType,
} from "@/lib/transactions";
import { createId } from "@/lib/id"

type CustomCategories = Record<TransactionType, CustomCategory[]>;

const EMPTY: CustomCategories = { income: [], expense: [] };

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
        ((entry as CustomCategory).type === "income" ||
          (entry as CustomCategory).type === "expense") &&
        typeof (entry as CustomCategory).label === "string" &&
        (entry as CustomCategory).label.trim().length > 0,
    )
    .map((entry) => ({
      ...entry,
      label: entry.label.trim(),
      iconKey: isCategoryIconKey(entry.iconKey)
        ? entry.iconKey
        : DEFAULT_CATEGORY_ICON,
    }));
}

function sanitize(parsed: unknown): CustomCategories {
  if (!parsed || typeof parsed !== "object") return EMPTY;
  const value = parsed as Partial<CustomCategories>;
  return {
    income: sanitizeList(value.income),
    expense: sanitizeList(value.expense),
  };
}

/**
 * Stores only the user-created categories. Built-in categories live in code,
 * so persisting them would waste space and turn every built-in change into a
 * data migration.
 */
export function useCustomCategories() {
  const [categories, setCategories] = React.useState<CustomCategories>(EMPTY);
  const [isLoaded, setIsLoaded] = React.useState(false);

  // Read effect must be declared before the write effect, otherwise the first
  // write would clobber the stored value.
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CUSTOM_CATEGORIES_STORAGE_KEY);
      if (raw) setCategories(sanitize(JSON.parse(raw)));
    } catch {
      // ignore malformed storage
    } finally {
      setIsLoaded(true);
    }
  }, []);

  React.useEffect(() => {
    if (!isLoaded) return;
    window.localStorage.setItem(
      CUSTOM_CATEGORIES_STORAGE_KEY,
      JSON.stringify(categories),
    );
  }, [categories, isLoaded]);

  const addCategory = React.useCallback(
    ({
      type,
      label,
      iconKey,
    }: {
      type: TransactionType;
      label: string;
      iconKey: string;
    }) => {
      const id = createId();
      const category: CustomCategory = {
        id,
        key: `custom-${id}`,
        type,
        label: label.trim(),
        iconKey: isCategoryIconKey(iconKey) ? iconKey : DEFAULT_CATEGORY_ICON,
        createdAt: Date.now(),
      };
      setCategories((prev) => ({
        ...prev,
        [type]: [...prev[type], category],
      }));
      return category;
    },
    [],
  );

  const updateCategory = React.useCallback(
    (
      id: string,
      patch: { label?: string; iconKey?: string; type?: TransactionType },
    ) => {
      setCategories((prev) => {
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
            ...(patch.label !== undefined ? { label: patch.label.trim() } : {}),
            ...(patch.iconKey !== undefined
              ? {
                  iconKey: isCategoryIconKey(patch.iconKey)
                    ? patch.iconKey
                    : DEFAULT_CATEGORY_ICON,
                }
              : {}),
          };

          if (patch.type && patch.type !== existing.type) {
            next[bucket].splice(index, 1);
            next[patch.type].push({ ...updated, type: patch.type });
          } else {
            next[bucket].splice(index, 1, updated);
          }
        }

        return next;
      });
    },
    [],
  );

  const removeCategory = React.useCallback((id: string) => {
    setCategories((prev) => ({
      income: prev.income.filter((c) => c.id !== id),
      expense: prev.expense.filter((c) => c.id !== id),
    }));
  }, []);

  return {
    categories,
    addCategory,
    updateCategory,
    removeCategory,
    isLoaded,
  };
}
