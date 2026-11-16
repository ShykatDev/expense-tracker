"use client";

/**
 * Queued versions of the data server actions, with the same names and
 * argument types. Data hooks import these instead of the raw actions, so
 * every change goes through the offline outbox (see ./sync.ts): it is sent
 * in order, waits while offline, and survives the app being closed.
 *
 * The one-time import actions and the reset actions are not queued: they
 * already retry on the next app open, or need the server to answer now.
 */

import { enqueue, registerAction } from "@/lib/offline/sync";
import * as transactions from "@/app/actions/transactions";
import * as accounts from "@/app/actions/accounts";
import * as categories from "@/app/actions/categories";
import * as goals from "@/app/actions/goals";
import * as recurring from "@/app/actions/recurring";
import * as targets from "@/app/actions/targets";

/** Registers `action` under `name` and returns a queued stand-in for it. */
function queued<A extends unknown[]>(
  name: string,
  queryKey: string,
  action: (...args: A) => Promise<unknown>,
): (...args: A) => Promise<void> {
  registerAction(name, action as (...args: unknown[]) => Promise<unknown>);
  return (...args: A) => enqueue(name, queryKey, args);
}

/* transactions */
export const addTransactionsAction = queued("transactions.addTransactions", "transactions", transactions.addTransactionsAction);
export const updateTransactionAction = queued("transactions.updateTransaction", "transactions", transactions.updateTransactionAction);
export const removeTransactionAction = queued("transactions.removeTransaction", "transactions", transactions.removeTransactionAction);
export const renameTransactionCategoryAction = queued("transactions.renameTransactionCategory", "transactions", transactions.renameTransactionCategoryAction);
export const reassignTransactionAccountAction = queued("transactions.reassignTransactionAccount", "transactions", transactions.reassignTransactionAccountAction);

/* accounts */
export const addAccountAction = queued("accounts.addAccount", "accounts", accounts.addAccountAction);
export const updateAccountAction = queued("accounts.updateAccount", "accounts", accounts.updateAccountAction);
export const removeAccountAction = queued("accounts.removeAccount", "accounts", accounts.removeAccountAction);
export const addTransferAction = queued("accounts.addTransfer", "accounts", accounts.addTransferAction);
export const removeTransferAction = queued("accounts.removeTransfer", "accounts", accounts.removeTransferAction);

/* categories */
export const addCustomCategoryAction = queued("categories.addCustomCategory", "categories", categories.addCustomCategoryAction);
export const updateCustomCategoryAction = queued("categories.updateCustomCategory", "categories", categories.updateCustomCategoryAction);
export const removeCustomCategoryAction = queued("categories.removeCustomCategory", "categories", categories.removeCustomCategoryAction);
export const setCategoryHiddenAction = queued("categories.setCategoryHidden", "categories", categories.setCategoryHiddenAction);

/* goals */
export const addGoalAction = queued("goals.addGoal", "goals", goals.addGoalAction);
export const updateGoalAction = queued("goals.updateGoal", "goals", goals.updateGoalAction);
export const reorderGoalsAction = queued("goals.reorderGoals", "goals", goals.reorderGoalsAction);
export const removeGoalAction = queued("goals.removeGoal", "goals", goals.removeGoalAction);
export const completeGoalAction = queued("goals.completeGoal", "goals", goals.completeGoalAction);
export const reopenGoalAction = queued("goals.reopenGoal", "goals", goals.reopenGoalAction);

/* recurring */
export const addRecurringRuleAction = queued("recurring.addRecurringRule", "recurring", recurring.addRecurringRuleAction);
export const updateRecurringRuleAction = queued("recurring.updateRecurringRule", "recurring", recurring.updateRecurringRuleAction);
export const removeRecurringRuleAction = queued("recurring.removeRecurringRule", "recurring", recurring.removeRecurringRuleAction);

/* targets */
export const upsertTargetAction = queued("targets.upsertTarget", "targets", targets.upsertTargetAction);
export const removeTargetAction = queued("targets.removeTarget", "targets", targets.removeTargetAction);
export const setTargetOverrideAction = queued("targets.setTargetOverride", "targets", targets.setTargetOverrideAction);
export const renameTargetLabelAction = queued("targets.renameTargetLabel", "targets", targets.renameTargetLabelAction);

/*
 * Undo: restores put deleted items back exactly, ids included. The import
 * actions already insert full rows and skip any that exist, which is just
 * what a restore needs.
 */
export const restoreTargetsAction = queued("targets.restore", "targets", targets.importTargetsAction);
export const restoreGoalsAction = queued("goals.restore", "goals", goals.importGoalsAction);
