"use server";

import * as data from "@/server/targets";
import { requireUserId } from "@/server/session";
import type { TargetInput } from "@/lib/targets";

/*
 * Monthly target writes. Each action checks the session first and only
 * touches the signed-in user's rows; arguments are validated again on the
 * server. Reads go through GET /api/data/targets instead, so they don't
 * queue behind saves.
 */

export async function upsertTargetAction(input: TargetInput) {
  const userId = await requireUserId();
  await data.upsertTarget(userId, input);
}

export async function removeTargetAction(categoryKey: string) {
  const userId = await requireUserId();
  await data.deleteTarget(userId, categoryKey);
}

/** Sets one month's value; `amount` undefined clears it. */
export async function setTargetOverrideAction(
  categoryKey: string,
  month: string,
  amount: number | undefined,
) {
  const userId = await requireUserId();
  await data.setTargetOverride(userId, categoryKey, month, amount);
}

export async function renameTargetLabelAction(categoryKey: string, categoryLabel: string) {
  const userId = await requireUserId();
  await data.renameTargetLabel(userId, categoryKey, categoryLabel);
}

/**
 * One-time upload of the targets saved in this browser before sign-in.
 * Safe to repeat: categories that already have a target are skipped.
 */
export async function importTargetsAction(rows: unknown[]) {
  const userId = await requireUserId();
  return data.insertTargets(userId, Array.isArray(rows) ? rows : []);
}

/** "Reset all data": removes every target on the account. */
export async function deleteAllTargetsAction() {
  const userId = await requireUserId();
  await data.deleteAllTargets(userId);
}
