import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// drizzle-kit doesn't read Next.js env files; load .env.local if present.
if (!process.env.DIRECT_URL && existsSync(".env.local")) process.loadEnvFile(".env.local");

// Introspection only. The Neon database was migrated from Supabase as-is,
// so the schema in src/db/schema.ts is PULLED from it (`pnpm db:pull`),
// never pushed. Do not run `drizzle-kit push`/`migrate` against Neon.
// Uses the unpooled DIRECT_URL (introspection needs a session connection).
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  schemaFilter: ["public", "auth"],
  tablesFilter: ["!auth.*", "auth.users"],
  dbCredentials: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
