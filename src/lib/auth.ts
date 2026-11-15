import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { getDb, schema } from "@/db";

/**
 * Where the app is served from. Set BETTER_AUTH_URL explicitly in production
 * (Google only redirects back to URLs registered in its console); on Vercel
 * the production domain is used as a fallback.
 */
function baseURL() {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://localhost:3000";
}

/** True once every secret sign-in needs is present. */
export function isAuthConfigured() {
  return Boolean(
    process.env.DATABASE_URL &&
      process.env.BETTER_AUTH_SECRET &&
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET,
  );
}

function createAuth() {
  return betterAuth({
    baseURL: baseURL(),
    // Read from BETTER_AUTH_SECRET by default; named here for clarity.
    secret: process.env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    // Google is the only way in: no email/password accounts.
    emailAndPassword: { enabled: false },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        // Let people with several Google accounts pick the right one.
        prompt: "select_account",
      },
    },
    session: {
      // A personal app on your own phone: stay signed in for 60 days,
      // renewed whenever it's used.
      expiresIn: 60 * 60 * 24 * 60,
      updateAge: 60 * 60 * 24,
      // Keep a short-lived signed copy in a cookie so most requests skip a
      // database round trip to check the session.
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    // Lets server actions set the session cookie (must stay last).
    plugins: [nextCookies()],
  });
}

let instance: ReturnType<typeof createAuth> | undefined;

/** Created on first use, so the app still builds before secrets are set. */
export function getAuth() {
  instance ??= createAuth();
  return instance;
}
