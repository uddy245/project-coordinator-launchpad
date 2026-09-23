#!/usr/bin/env node
/**
 * Turn `drizzle-kit pull` output (drizzle/schema.ts) into the app schema
 * (src/db/schema.ts), deterministically, so "is the app schema in sync with
 * Neon?" is a plain file comparison.
 *
 *   pnpm db:pull           # introspect Neon (DIRECT_URL) and --check
 *   node scripts/db-normalize-schema.mjs           # rewrite src/db/schema.ts
 *   node scripts/db-normalize-schema.mjs --check   # exit 1 if it would change
 *
 * Edits applied to the generated file:
 *   - timestamptz columns read as ISO strings (PostgREST parity)
 *   - numeric columns read as JS numbers
 *   - tsvector custom type (drizzle-kit emits `unknown(...)`)
 *   - fixes drizzle-kit's broken empty-string defaults (`.default('),`)
 *   - drops the quiz_items_public view (it filters on auth.uid(); unused)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import prettier from "prettier";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = resolve(ROOT, "drizzle/schema.ts");
const OUT = resolve(ROOT, "src/db/schema.ts");
const check = process.argv.includes("--check");

let s = readFileSync(SRC, "utf8");

const HEADER = `/**
 * Drizzle schema for the Neon database (project pc-launchpad).
 *
 * GENERATED — do not edit by hand. \`pnpm db:pull\` introspects Neon and
 * scripts/db-normalize-schema.mjs rewrites the result into this file. The
 * database is the source of truth; never push/migrate from this file.
 *
 * NOTE: RLS is disabled on every public table. Access control lives in
 * server code — every user-facing query must filter by the app user id.
 */
`;

const HELPERS = `
const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

/**
 * timestamptz read as an ISO-8601 string, matching what PostgREST/Supabase
 * returned (Postgres' own text form "2026-01-01 12:00:00+00" is not ISO and
 * trips up \`.slice(0, 10)\`-style code and some Date parsers).
 */
export function toIsoTimestamp(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  const s = String(value).replace(" ", "T").replace(/([+-]\\d\\d)$/, "$1:00");
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? String(value) : d.toISOString();
}

const timestamptz = customType<{ data: string; driverData: string | Date }>({
  dataType() {
    return "timestamp with time zone";
  },
  fromDriver(value) {
    return toIsoTimestamp(value);
  },
});
`;

// Imports: drop timestamp/pgView, add customType.
s = s.replace(/^import \{([^}]*)\} from "drizzle-orm\/pg-core"/m, (_m, names) => {
  const keep = names
    .split(",")
    .map((n) => n.trim())
    .filter((n) => n && n !== "timestamp" && n !== "pgView");
  return `import { ${[...keep, "customType"].sort().join(", ")} } from "drizzle-orm/pg-core"`;
});
s = s.replace(/(import \{ sql \} from "drizzle-orm";?\n)/, (m) => m + HELPERS);

s = s.replace(
  /timestamp\("([a-z_]+)", \{ withTimezone: true, mode: 'string' \}\)/g,
  'timestamptz("$1")'
);
s = s.replace(/\.defaultNow\(\)/g, ".default(sql`now()`)");
s = s.replace(/numeric\("([a-z_]+)"\)/g, 'numeric("$1", { mode: "number" })');
s = s.replace(
  /numeric\("([a-z_]+)", \{ precision: (\d+), scale:\s+(\d+) \}\)/g,
  'numeric("$1", { precision: $2, scale: $3, mode: "number" })'
);
s = s.replace(/\.array\(\)\.default\(\[""\]\)/g, ".array().default(sql`'{}'::text[]`)");
s = s.replace(/\.default\('\),/g, ".default(''),");
s = s.replace(/\t\/\/ TODO: failed to parse database type 'tsvector'\n/g, "");
s = s.replace(/unknown\("search_text"\)/g, 'tsvector("search_text")');

// Drop the view (last-resort regex: from its export to the next export/EOF).
s = s.replace(/export const quizItemsPublic = pgView\([\s\S]*?(?=\nexport const |\s*$)/, "");

// drizzle-kit on Postgres 18 lists composite key columns alphabetically, not
// in key order (Neon itself has e.g. PRIMARY KEY (user_id, lesson_id)).
// Canonicalise to sorted order so the check is stable across PG versions.
// The schema is never pushed, so key column order has no runtime effect.
const sortCols = (list) =>
  list
    .split(",")
    .map((c) => c.trim())
    .sort()
    .join(", ");
s = s.replace(
  /columns: \[(table\.\w+(?:,\s*table\.\w+)+)\]/g,
  (_m, l) => `columns: [${sortCols(l)}]`
);
s = s.replace(/\.on\((table\.\w+(?:,\s*table\.\w+)+)\)/g, (_m, l) => `.on(${sortCols(l)})`);

// drizzle-kit emits tables in catalog order, which differs between databases
// with identical schemas. Sort table declarations by name (FK references are
// resolved lazily, so order doesn't matter); schema/enum declarations keep
// their order ahead of the tables.
{
  const parts = s.split(/\n(?=export const )/);
  const isTable = (p) => /^export const \w+ = (pgTable|\w+\.table)\(/.test(p);
  const name = (p) => p.match(/^export const (\w+)/)[1];
  const head = parts.filter((p) => !isTable(p));
  const tables = parts.filter(isTable).sort((a, b) => name(a).localeCompare(name(b)));
  s = [...head, ...tables].map((p) => p.trimEnd()).join("\n\n") + "\n";
}

const formatted = await prettier.format(HEADER + s, {
  ...(await prettier.resolveConfig(OUT)),
  filepath: OUT,
  parser: "typescript",
});

if (check) {
  const current = readFileSync(OUT, "utf8");
  if (current !== formatted) {
    console.error("src/db/schema.ts is OUT OF SYNC with the database.");
    console.error("Run: node scripts/db-normalize-schema.mjs  and review the diff.");
    process.exit(1);
  }
  console.log("src/db/schema.ts matches the database schema. No diff.");
} else {
  writeFileSync(OUT, formatted);
  console.log("Wrote src/db/schema.ts");
}
