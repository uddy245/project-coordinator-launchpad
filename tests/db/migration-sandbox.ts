/**
 * Helpers for integration tests that run a real SQL migration file against
 * the local replica (tests/db/build-replica.sh).
 *
 * Each test opens a transaction, builds the starting state it needs, runs the
 * migration, asserts, and rolls back. Nothing is left behind and parallel
 * test files never see the intermediate rows.
 *
 * Migration files carry their own `begin;` / `commit;`. Inside the test's
 * transaction those two lines become a savepoint and its release, so every
 * other statement runs exactly as written and still applies atomically.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";

const REPO_ROOT = resolve(__dirname, "..", "..");

export function readRepoFile(relativePath: string): string {
  return readFileSync(resolve(REPO_ROOT, relativePath), "utf8");
}

/** The migration's statements, with its outer transaction turned into a savepoint. */
export function migrationForSandbox(relativePath: string): string {
  const sql = readRepoFile(relativePath);
  const begins = sql.match(/^begin;$/gm)?.length ?? 0;
  const commits = sql.match(/^commit;$/gm)?.length ?? 0;
  if (begins !== 1 || commits !== 1) {
    throw new Error(
      `${relativePath}: expected exactly one "begin;" and one "commit;" line, found ${begins} and ${commits}`
    );
  }
  return sql
    .replace(/^begin;$/m, "savepoint migration_under_test;")
    .replace(/^commit;$/m, "release savepoint migration_under_test;");
}

export function replicaClient(): Client {
  return new Client({ connectionString: process.env.TEST_DATABASE_URL });
}
