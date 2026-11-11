"use client";

import * as React from "react";

import {
  useCategoryVisibility,
  type HiddenCategories,
} from "@/hooks/use-category-visibility";
import { useCustomCategories } from "@/hooks/use-custom-categories";
import type { TransactionType } from "@/lib/transactions";

interface CategoriesContextValue {
  categories: ReturnType<typeof useCustomCategories>["categories"];
  addCategory: ReturnType<typeof useCustomCategories>["addCategory"];
  updateCategory: ReturnType<typeof useCustomCategories>["updateCategory"];
  removeCategory: ReturnType<typeof useCustomCategories>["removeCategory"];
  isLoaded: boolean;
  hidden: HiddenCategories;
  toggleCategory: (type: TransactionType, key: string) => void;
}

const CategoriesContext = React.createContext<CategoriesContextValue | null>(
  null,
);

/**
 * Single source of truth for categories across routes. The underlying hooks
 * are localStorage backed, so two independent instances would drift apart:
 * a category added on /categories would not show up in the dashboard drawers.
 * This provider lives in the root layout, which is preserved across client
 * side navigation, so both routes share one instance.
 */
export function CategoriesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { categories, addCategory, updateCategory, removeCategory, isLoaded } =
    useCustomCategories();
  const { hidden, toggleCategory } = useCategoryVisibility();

  const value = React.useMemo(
    () => ({
      categories,
      addCategory,
      updateCategory,
      removeCategory,
      isLoaded,
      hidden,
      toggleCategory,
    }),
    [
      categories,
      addCategory,
      updateCategory,
      removeCategory,
      isLoaded,
      hidden,
      toggleCategory,
    ],
  );

  return (
    <CategoriesContext.Provider value={value}>
      {children}
    </CategoriesContext.Provider>
  );
}

export function useCategories() {
  const context = React.useContext(CategoriesContext);
  if (!context) {
    throw new Error("useCategories must be used within a CategoriesProvider");
  }
  return context;
}
