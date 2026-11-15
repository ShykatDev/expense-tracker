"use server";

import * as data from "@/server/categories";
import { requireUserId } from "@/server/session";
import type { CustomCategoryPatch } from "@/lib/categories-ops";
import type { TransactionType } from "@/lib/transactions";

/*
 * Category writes (custom categories and which ones are hidden). Each action
 * checks the session first and only touches the signed-in user's rows.
 * Reads go through GET /api/data/categories.
 */

/** Saves a custom category the client already created (id included). */
export async function addCustomCategoryAction(category: unknown) {
  const userId = await requireUserId();
  await data.insertCustomCategories(userId, [category]);
}

export async function updateCustomCategoryAction(id: string, patch: CustomCategoryPatch) {
  const userId = await requireUserId();
  await data.updateCustomCategory(userId, id, patch);
}

export async function removeCustomCategoryAction(id: string) {
  const userId = await requireUserId();
  await data.deleteCustomCategory(userId, id);
}

/** Hides or shows one category on the entry screen. */
export async function setCategoryHiddenAction(
  type: TransactionType,
  key: string,
  hidden: boolean,
) {
  const userId = await requireUserId();
  await data.setHidden(userId, type, key, hidden);
}

/**
 * One-time upload of the categories saved in this browser before sign-in.
 * Safe to repeat: categories and hidden keys already on the server are kept.
 */
export async function importCategoriesAction(input: { custom: unknown[]; hidden: unknown }) {
  const userId = await requireUserId();
  const custom = await data.insertCustomCategories(userId, input?.custom ?? []);
  const hidden = await data.insertHidden(userId, input?.hidden);
  return { custom, hidden };
}

/** "Reset all data": removes every custom category and hidden flag. */
export async function deleteAllCategoriesAction() {
  const userId = await requireUserId();
  await data.deleteAllCategories(userId);
}
