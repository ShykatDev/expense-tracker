"use server";

import * as data from "@/server/recurring";
import { requireUserId } from "@/server/session";

/*
 * Recurring-rule writes. Each action checks the session first and only
 * touches the signed-in user's rows. Reads go through GET
 * /api/data/recurring instead: server actions run one at a time, which
 * suits writes but would hold reads up behind them.
 *
 * Rules arrive fully computed (settling and period keys depend on the
 * user's time zone), and the server validates every field.
 */

/** Saves a rule the client already created (id included). */
export async function addRecurringRuleAction(rule: unknown) {
  const userId = await requireUserId();
  await data.insertRecurringRules(userId, [rule]);
}

/** Stores a rule's new state: an edit, a pause or resume, a handled occurrence. */
export async function updateRecurringRuleAction(rule: unknown) {
  const userId = await requireUserId();
  await data.saveRecurringRule(userId, rule);
}

export async function removeRecurringRuleAction(id: string) {
  const userId = await requireUserId();
  await data.deleteRecurringRule(userId, id);
}

/**
 * One-time upload of the rules saved in this browser before sign-in.
 * Safe to repeat: rules already on the server are skipped by id.
 */
export async function importRecurringRulesAction(rules: unknown[]) {
  const userId = await requireUserId();
  return data.insertRecurringRules(userId, Array.isArray(rules) ? rules : []);
}

/** "Reset all data": removes every recurring rule on the account. */
export async function deleteAllRecurringAction() {
  const userId = await requireUserId();
  await data.deleteAllRecurringRules(userId);
}
