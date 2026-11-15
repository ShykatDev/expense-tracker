"use client";

import * as React from "react";

import {
  addCustomCategory,
  applyCategoryPatch,
  createCustomCategory,
  EMPTY_CUSTOM_CATEGORIES,
  normalizeCategoryPatch,
  removeCustomCategory,
  sanitizeCustomCategories,
  type CustomCategories,
  type CustomCategoryPatch,
  type NewCustomCategory,
} from "@/lib/categories-ops";
import { CUSTOM_CATEGORIES_STORAGE_KEY } from "@/lib/transactions";

/** Reads this browser's custom categories, validated. Empty when unreadable. */
export function readLocalCustomCategories(): CustomCategories {
  try {
    const raw = window.localStorage.getItem(CUSTOM_CATEGORIES_STORAGE_KEY);
    return raw ? sanitizeCustomCategories(JSON.parse(raw)) : EMPTY_CUSTOM_CATEGORIES;
  } catch {
    return EMPTY_CUSTOM_CATEGORIES;
  }
}

/**
 * Stores only the user-created categories, in this browser. Built-in
 * categories live in code, so persisting them would waste space and turn
 * every built-in change into a data migration.
 */
export function useLocalCustomCategories() {
  const [categories, setCategories] = React.useState<CustomCategories>(EMPTY_CUSTOM_CATEGORIES);
  const [isLoaded, setIsLoaded] = React.useState(false);

  // Read effect must be declared before the write effect, otherwise the first
  // write would clobber the stored value.
  React.useEffect(() => {
    setCategories(readLocalCustomCategories());
    setIsLoaded(true);
  }, []);

  React.useEffect(() => {
    if (!isLoaded) return;
    window.localStorage.setItem(CUSTOM_CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
  }, [categories, isLoaded]);

  const addCategory = React.useCallback((input: NewCustomCategory) => {
    const category = createCustomCategory(input);
    setCategories((prev) => addCustomCategory(prev, category));
    return category;
  }, []);

  const updateCategory = React.useCallback((id: string, patch: CustomCategoryPatch) => {
    const normalized = normalizeCategoryPatch(patch);
    setCategories((prev) => applyCategoryPatch(prev, id, normalized));
  }, []);

  const removeCategory = React.useCallback((id: string) => {
    setCategories((prev) => removeCustomCategory(prev, id));
  }, []);

  return {
    categories,
    addCategory,
    updateCategory,
    removeCategory,
    isLoaded,
  };
}
