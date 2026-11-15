"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "@yusufceng1z/ding-react";

import {
  addCustomCategoryAction,
  importCategoriesAction,
  removeCustomCategoryAction,
  setCategoryHiddenAction,
  updateCustomCategoryAction,
} from "@/app/actions/categories";
import { readLocalHiddenCategories } from "@/hooks/use-category-visibility";
import { readLocalCustomCategories } from "@/hooks/use-custom-categories";
import {
  addCustomCategory,
  applyCategoryPatch,
  createCustomCategory,
  EMPTY_CUSTOM_CATEGORIES,
  EMPTY_HIDDEN_CATEGORIES,
  isCategoryHidden,
  normalizeCategoryPatch,
  removeCustomCategory,
  setCategoryHidden,
  type CustomCategories,
  type CustomCategoryPatch,
  type HiddenCategories,
  type NewCustomCategory,
} from "@/lib/categories-ops";
import type { TransactionType } from "@/lib/transactions";

export const CATEGORIES_QUERY_KEY = ["categories"] as const;

/** Set once this browser's local categories have been uploaded to the account. */
const IMPORTED_FLAG_KEY = "expense-tracker:imported:categories";

interface CategoriesData {
  custom: CustomCategories;
  hidden: HiddenCategories;
}

const EMPTY: CategoriesData = { custom: EMPTY_CUSTOM_CATEGORIES, hidden: EMPTY_HIDDEN_CATEGORIES };

class SignedOutError extends Error {}

async function fetchCategories(): Promise<CategoriesData> {
  const response = await fetch("/api/data/categories", { cache: "no-store" });
  if (response.status === 401) throw new SignedOutError("Signed out");
  if (!response.ok) throw new Error(`Couldn't load categories (${response.status})`);
  return response.json();
}

/**
 * Custom categories and hidden flags stored in Neon, with the same API as the
 * browser-storage hooks combined, so no screen has to change.
 *
 * Every change is optimistic: the lists update at once and the save runs in
 * the background. If the save fails, they go back to what they were and a
 * toast says so.
 */
export function useRemoteCategories() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: CATEGORIES_QUERY_KEY,
    queryFn: fetchCategories,
    retry: (count, error) => !(error instanceof SignedOutError) && count < 1,
  });

  const categories = query.data?.custom ?? EMPTY.custom;
  const hidden = query.data?.hidden ?? EMPTY.hidden;

  /**
   * Applies `update` to the cached data now, then runs `save`. On failure the
   * data is restored and refetched so it matches the server again.
   */
  const optimistic = React.useCallback(
    (update: (data: CategoriesData) => CategoriesData, save: () => Promise<unknown>) => {
      void queryClient.cancelQueries({ queryKey: CATEGORIES_QUERY_KEY });
      const previous = queryClient.getQueryData<CategoriesData>(CATEGORIES_QUERY_KEY);
      queryClient.setQueryData<CategoriesData>(CATEGORIES_QUERY_KEY, (data) => update(data ?? EMPTY));
      save().catch(() => {
        queryClient.setQueryData(CATEGORIES_QUERY_KEY, previous);
        void queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
        toast.error("Couldn’t save that change. Check your connection and try again.");
      });
    },
    [queryClient],
  );

  const addCategory = React.useCallback(
    (input: NewCustomCategory) => {
      const category = createCustomCategory(input);
      optimistic(
        (data) => ({ ...data, custom: addCustomCategory(data.custom, category) }),
        () => addCustomCategoryAction(category),
      );
      // Returned straight away, so callers can keep the new id.
      return category;
    },
    [optimistic],
  );

  const updateCategory = React.useCallback(
    (id: string, patch: CustomCategoryPatch) => {
      const normalized = normalizeCategoryPatch(patch);
      optimistic(
        (data) => ({ ...data, custom: applyCategoryPatch(data.custom, id, normalized) }),
        () => updateCustomCategoryAction(id, normalized),
      );
    },
    [optimistic],
  );

  const removeCategory = React.useCallback(
    (id: string) => {
      optimistic(
        (data) => ({ ...data, custom: removeCustomCategory(data.custom, id) }),
        () => removeCustomCategoryAction(id),
      );
    },
    [optimistic],
  );

  // The server is told the resulting state rather than "toggle", so a
  // retried request can't flip it back.
  const toggleCategory = React.useCallback(
    (type: TransactionType, key: string) => {
      const current = queryClient.getQueryData<CategoriesData>(CATEGORIES_QUERY_KEY) ?? EMPTY;
      const nextHidden = !isCategoryHidden(current.hidden, type, key);
      optimistic(
        (data) => ({ ...data, hidden: setCategoryHidden(data.hidden, type, key, nextHidden) }),
        () => setCategoryHiddenAction(type, key, nextHidden),
      );
    },
    [optimistic, queryClient],
  );

  // One-time import: categories and hidden flags saved in this browser before
  // sign-in are uploaded once. Ids are kept, so running it again can't
  // duplicate anything. The local copy stays as a backup for now.
  const importStarted = React.useRef(false);
  React.useEffect(() => {
    if (!query.isSuccess || importStarted.current) return;
    importStarted.current = true;
    try {
      if (window.localStorage.getItem(IMPORTED_FLAG_KEY)) return;
    } catch {
      return;
    }
    const custom = readLocalCustomCategories();
    const localHidden = readLocalHiddenCategories();
    const markDone = () => {
      try {
        window.localStorage.setItem(IMPORTED_FLAG_KEY, String(Date.now()));
      } catch {
        // Storage blocked: the import may run again, which is harmless.
      }
    };
    const customList = [...custom.income, ...custom.expense];
    if (customList.length === 0 && localHidden.income.length + localHidden.expense.length === 0) {
      markDone();
      return;
    }
    importCategoriesAction({ custom: customList, hidden: localHidden })
      .then((result) => {
        markDone();
        void queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
        if (result.custom > 0) {
          toast.success(
            `Moved ${result.custom} ${result.custom === 1 ? "category" : "categories"} from this device to your account`,
          );
        } else if (result.hidden > 0) {
          toast.success("Moved your hidden categories from this device to your account");
        }
      })
      .catch(() => {
        // Not marked done, so it's tried again next time the app opens.
        importStarted.current = false;
        toast.error("Couldn’t upload this device’s categories yet. It will retry next time.");
      });
  }, [query.isSuccess, queryClient]);

  // A failed first load (not just being signed out) is worth a toast.
  React.useEffect(() => {
    if (query.isError && !(query.error instanceof SignedOutError)) {
      toast.error("Couldn’t load your categories. Reopen the app to try again.");
    }
  }, [query.isError, query.error]);

  return {
    categories,
    addCategory,
    updateCategory,
    removeCategory,
    isLoaded: !query.isPending,
    hidden,
    toggleCategory,
  };
}
