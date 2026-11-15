"use client";

import * as React from "react";

import { useRemoteCategories } from "@/hooks/use-remote-categories";
import {
  useLocalCategoryVisibility,
  type HiddenCategories,
} from "@/hooks/use-category-visibility";
import { useLocalCustomCategories } from "@/hooks/use-custom-categories";
import type { TransactionType } from "@/lib/transactions";

type LocalCustomCategories = ReturnType<typeof useLocalCustomCategories>;

interface CategoriesContextValue {
  categories: LocalCustomCategories["categories"];
  addCategory: LocalCustomCategories["addCategory"];
  updateCategory: LocalCustomCategories["updateCategory"];
  removeCategory: LocalCustomCategories["removeCategory"];
  isLoaded: boolean;
  hidden: HiddenCategories;
  toggleCategory: (type: TransactionType, key: string) => void;
}

const CategoriesContext = React.createContext<CategoriesContextValue | null>(
  null,
);

/** Memoized context value, so consumers only re-render when data changes. */
function useContextValue(state: CategoriesContextValue): CategoriesContextValue {
  const {
    categories,
    addCategory,
    updateCategory,
    removeCategory,
    isLoaded,
    hidden,
    toggleCategory,
  } = state;
  return React.useMemo(
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
}

function LocalCategoriesProvider({ children }: { children: React.ReactNode }) {
  const custom = useLocalCustomCategories();
  const visibility = useLocalCategoryVisibility();
  const value = useContextValue({ ...custom, ...visibility });
  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>;
}

function RemoteCategoriesProvider({ children }: { children: React.ReactNode }) {
  const value = useContextValue(useRemoteCategories());
  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>;
}

/**
 * Single source of truth for categories across routes, hosted in the root
 * layout so every route shares one instance (two would drift apart).
 *
 * `remote` is decided on the server: once sign-in and the database are
 * configured, categories live in Neon and sync across devices; otherwise
 * they stay in this browser's localStorage. Both expose the same API.
 */
export function CategoriesProvider({
  remote = false,
  children,
}: {
  remote?: boolean;
  children: React.ReactNode;
}) {
  return remote ? (
    <RemoteCategoriesProvider>{children}</RemoteCategoriesProvider>
  ) : (
    <LocalCategoriesProvider>{children}</LocalCategoriesProvider>
  );
}

export function useCategories() {
  const context = React.useContext(CategoriesContext);
  if (!context) {
    throw new Error("useCategories must be used within a CategoriesProvider");
  }
  return context;
}
