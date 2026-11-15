import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

/**
 * The database client. Neon's HTTP driver sends each query as one HTTPS
 * request, which suits Vercel Functions: no connection pool to keep warm
 * between invocations. Server-only, so the connection string never reaches
 * the browser.
 */
function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env.local (see .env.example) or connect Neon in Vercel.",
    );
  }
  return drizzle(neon(url), { schema, casing: "snake_case" });
}

let instance: ReturnType<typeof createDb> | undefined;

/** Created on first use, so builds without DATABASE_URL still succeed. */
export function getDb() {
  instance ??= createDb();
  return instance;
}

export { schema };
