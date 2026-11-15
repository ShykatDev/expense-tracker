"use server";

import * as data from "@/server/goals";
import { requireUserId } from "@/server/session";
import type { GoalPatch } from "@/lib/goal-ops";

/*
 * Goal and goal-completion writes. Each action checks the session first and
 * only touches the signed-in user's rows. Reads go through
 * GET /api/data/goals instead: server actions run one at a time, which suits
 * writes but would hold reads up behind them.
 */

/** Saves a goal the client already created (id included). */
export async function addGoalAction(goal: unknown) {
  const userId = await requireUserId();
  await data.insertGoals(userId, [goal]);
}

export async function updateGoalAction(id: string, patch: GoalPatch) {
  const userId = await requireUserId();
  await data.updateGoal(userId, id, patch);
}

/** Saves the whole priority order in one go. */
export async function reorderGoalsAction(orderedIds: string[]) {
  const userId = await requireUserId();
  await data.reorderGoals(userId, orderedIds);
}

export async function removeGoalAction(id: string) {
  const userId = await requireUserId();
  await data.deleteGoal(userId, id);
}

/** Records how a goal was fulfilled and marks it completed. */
export async function completeGoalAction(completion: unknown) {
  const userId = await requireUserId();
  await data.completeGoal(userId, completion);
}

export async function reopenGoalAction(id: string) {
  const userId = await requireUserId();
  await data.reopenGoal(userId, id);
}

/**
 * One-time upload of the goals saved in this browser before sign-in. Goals
 * go first so completions can point at them. Safe to repeat: rows already on
 * the server are skipped by id.
 */
export async function importGoalsAction(goals: unknown[], completions: unknown[]) {
  const userId = await requireUserId();
  const goalResult = await data.insertGoals(userId, Array.isArray(goals) ? goals : []);
  const completionResult = await data.insertCompletions(
    userId,
    Array.isArray(completions) ? completions : [],
  );
  return { goals: goalResult.inserted, completions: completionResult.inserted };
}

/** "Reset all data": removes every goal and completion on the account. */
export async function deleteAllGoalsAction() {
  const userId = await requireUserId();
  await data.deleteAllGoals(userId);
}
