import "server-only";

import { headers } from "next/headers";

import { getAuth } from "@/lib/auth";

/** The signed-in user's id, or null. Checked against the database session. */
export async function getUserId() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
  }
}

/**
 * Every server action and data route starts here: server actions can be
 * called with a direct POST, so the UI hiding a button is never enough.
 */
export async function requireUserId() {
  const userId = await getUserId();
  if (!userId) throw new UnauthorizedError();
  return userId;
}
