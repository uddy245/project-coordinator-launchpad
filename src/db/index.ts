import "server-only";
import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { Pool as PgPool } from "pg";
import ws from "ws";
import { env } from "@/env";
import * as schema from "./schema";

/**
 * Server-only Drizzle client for the Neon database.
 *
 * Neon URLs use the serverless driver over WebSockets (supports
 * transactions). Any other URL — a local Postgres used by integration
 * tests — uses node-postgres. Both expose the same query API.
 *
 * There is no RLS: this client can read and write every row. Every
 * user-facing query MUST filter by the authenticated app user id
 * (see `getAppUser()` in `@/lib/auth/session`).
 */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

function createDb(url: string): Db {
  if (new URL(url).hostname.endsWith(".neon.tech")) {
    neonConfig.webSocketConstructor = ws;
    return drizzleNeon({ client: new NeonPool({ connectionString: url }), schema });
  }
  return drizzlePg({ client: new PgPool({ connectionString: url }), schema });
}

const globalForDb = globalThis as unknown as { __db?: Db };

function getDb(): Db {
  // Created on first use (not at import) so `next build` with
  // SKIP_ENV_VALIDATION doesn't need a database URL. Cached on
  // globalThis so dev hot-reloads don't leak pools.
  globalForDb.__db ??= createDb(env.DATABASE_URL);
  return globalForDb.__db;
}

export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export { schema };
