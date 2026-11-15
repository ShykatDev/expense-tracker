"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Browser-side auth: start Google sign-in, read the session, sign out.
 * Same origin as the app, so no base URL is needed.
 */
export const authClient = createAuthClient();

export const { signIn, signOut, useSession } = authClient;
