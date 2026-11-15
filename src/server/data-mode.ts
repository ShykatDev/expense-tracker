import "server-only";

import { cookies } from "next/headers";

import { isAuthConfigured } from "@/lib/auth";
import { GUEST_COOKIE } from "@/lib/guest";

/**
 * True when data should live in Neon: sign-in is configured and the visitor
 * hasn't chosen "Skip for now". Guests keep everything in the browser.
 */
export async function isRemoteData() {
  if (!isAuthConfigured()) return false;
  const cookieStore = await cookies();
  return !cookieStore.has(GUEST_COOKIE);
}
