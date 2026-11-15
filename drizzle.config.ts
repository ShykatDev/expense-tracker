import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Next.js reads .env.local itself; drizzle-kit runs outside Next, so load it.
config({ path: ".env.local" });

/**
 * Drizzle Kit: `npm run db:generate` writes SQL migrations from
 * src/db/schema.ts into ./drizzle, `npm run db:migrate` applies them to the
 * Neon database in DATABASE_URL, and `npm run db:studio` opens a browser
 * view of the data.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  casing: "snake_case",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
});
