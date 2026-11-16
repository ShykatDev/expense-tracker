"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";

import { getDb, schema } from "@/db";
import { getAuth } from "@/lib/auth";
import { requireUserId } from "@/server/session";

/**
 * "Delete my account": signs the user out, then deletes their user row.
 * Every app table and the auth tables reference the user with ON DELETE
 * CASCADE, so all of their data — transactions, accounts, goals, sessions,
 * the Google link — goes with it in one statement. Can't be undone.
 */
export async function deleteMyAccountAction() {
  const userId = await requireUserId();
  // Clears the session cookies (via the nextCookies plugin) before the
  // session rows disappear, so the browser isn't left holding a dead one.
  await getAuth().api.signOut({ headers: await headers() });
  await getDb().delete(schema.user).where(eq(schema.user.id, userId));
}
