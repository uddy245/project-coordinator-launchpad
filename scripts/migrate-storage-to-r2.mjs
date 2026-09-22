/**
 * ONE-OFF: copy every object from the four Supabase Storage buckets into the
 * single Cloudflare R2 bucket, then (optionally) rewrite stored public URLs.
 *
 *   Supabase bucket/path  ->  R2 key `${bucket}/${path}` in R2_BUCKET
 *   buckets: submissions, capstone-artifacts, lesson-templates, lesson-videos
 *
 * - Lists via the Storage REST API with plain fetch (no @supabase/* import):
 *   POST {SUPABASE_URL}/storage/v1/object/list/{bucket} {prefix, limit, offset},
 *   recursing into folders.
 * - Streams each object (GET {SUPABASE_URL}/storage/v1/object/{bucket}/{path})
 *   into R2, preserving Content-Type.
 * - Skips objects already in R2 with the same size (HeadObject), so re-runs are
 *   cheap and resumable.
 * - With --apply --rewrite-urls (and only if every copy succeeded), rewrites in
 *   ONE transaction:
 *     lessons.video_url, lesson_templates.file_url
 *       `${SUPABASE_URL}/storage/v1/object/public/<bucket>/<path>`
 *       -> `${NEXT_PUBLIC_APP_URL}/api/files/<bucket>/<path>`
 *   printing before -> after. `--rewrite-urls` without --apply previews them.
 * - submissions.storage_path and capstone_artifacts.file_path are
 *   bucket-relative keys (not URLs) and carry over unchanged — no rewrite.
 *
 * Dry run (default) lists and HEADs only; nothing is written anywhere.
 *
 * Env (set SUPABASE_* only for this run):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
 *     (optional in dry run: without them the R2 existence check is skipped)
 *   DIRECT_URL ?? DATABASE_URL, NEXT_PUBLIC_APP_URL   (only for --rewrite-urls)
 *
 *   node --env-file=.env.local scripts/migrate-storage-to-r2.mjs
 *   node --env-file=.env.local scripts/migrate-storage-to-r2.mjs --rewrite-urls
 *   node --env-file=.env.local scripts/migrate-storage-to-r2.mjs --apply
 *   node --env-file=.env.local scripts/migrate-storage-to-r2.mjs --apply --rewrite-urls
 */
import { Readable } from "node:stream";
import {
  BUCKETS,
  PUBLIC_BUCKETS,
  closeDb,
  db,
  headObject,
  objectKey,
  publicUrl,
  putObject,
  requireEnv,
} from "./lib/neon-r2.mjs";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const rewriteUrls = args.includes("--rewrite-urls");
const PAGE = 1000;

const R2_VARS = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"];
const { SUPABASE_URL: RAW_URL, SUPABASE_SERVICE_ROLE_KEY: KEY } = requireEnv([
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
]);
const SUPABASE_URL = RAW_URL.replace(/\/+$/, "");
if (apply) requireEnv(R2_VARS);
const haveR2 = R2_VARS.every((n) => process.env[n]);
if (rewriteUrls) {
  requireEnv(["NEXT_PUBLIC_APP_URL"]);
  if (!process.env.DIRECT_URL && !process.env.DATABASE_URL) {
    console.error("Missing env: DIRECT_URL or DATABASE_URL (needed for --rewrite-urls).");
    process.exit(1);
  }
}

const authHeaders = { Authorization: `Bearer ${KEY}`, apikey: KEY };
const encodePath = (p) => p.split("/").map(encodeURIComponent).join("/");
const human = (b) =>
  b == null
    ? "?"
    : b >= 1024 * 1024
      ? `${(b / 1024 / 1024).toFixed(1)} MB`
      : `${(b / 1024).toFixed(1)} KB`;

/** Recursively list every object in `bucket` under `prefix`. */
async function listAll(bucket, prefix = "") {
  const out = [];
  for (let offset = 0; ; offset += PAGE) {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${bucket}`, {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        prefix,
        limit: PAGE,
        offset,
        sortBy: { column: "name", order: "asc" },
      }),
    });
    if (!res.ok) {
      throw new Error(`list ${bucket}/${prefix}: HTTP ${res.status} ${await res.text()}`);
    }
    const items = await res.json();
    for (const it of items) {
      const path = prefix ? `${prefix}/${it.name}` : it.name;
      // Folders come back with a null id / metadata.
      if (it.id == null) {
        out.push(...(await listAll(bucket, path)));
      } else if (it.name !== ".emptyFolderPlaceholder") {
        out.push({
          bucket,
          path,
          size: it.metadata?.size ?? null,
          contentType: it.metadata?.mimetype ?? null,
        });
      }
    }
    if (items.length < PAGE) break;
  }
  return out;
}

/** Stream one object from Supabase into R2. */
async function copyObject(o) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${o.bucket}/${encodePath(o.path)}`, {
    headers: authHeaders,
  });
  if (!res.ok || !res.body) {
    throw new Error(`download HTTP ${res.status} ${res.ok ? "(empty body)" : await res.text()}`);
  }
  const contentType =
    o.contentType ?? res.headers.get("content-type") ?? "application/octet-stream";
  const lenHeader = res.headers.get("content-length");
  const length = lenHeader != null ? Number(lenHeader) : o.size;
  if (length == null) {
    // S3 PutObject needs a known length for streamed bodies; buffer instead.
    const buf = Buffer.from(await res.arrayBuffer());
    await putObject(o.bucket, o.path, buf, contentType, buf.length);
  } else {
    await putObject(o.bucket, o.path, Readable.fromWeb(res.body), contentType, length);
  }
}

/** Map a Supabase public URL to the app URL; null if it isn't one. */
function rewrite(url) {
  const prefix = `${SUPABASE_URL}/storage/v1/object/public/`;
  if (typeof url !== "string" || !url.startsWith(prefix)) return null;
  const rest = url.slice(prefix.length).split(/[?#]/)[0];
  const slash = rest.indexOf("/");
  if (slash <= 0) return { error: "no path" };
  const bucket = rest.slice(0, slash);
  const path = rest.slice(slash + 1);
  if (!PUBLIC_BUCKETS.includes(bucket)) return { error: `bucket ${bucket} is not public` };
  return { to: publicUrl(bucket, path) };
}

async function planRewrites(client) {
  const like = `${SUPABASE_URL}/storage/v1/object/public/%`;
  const targets = [
    { table: "lessons", column: "video_url" },
    { table: "lesson_templates", column: "file_url" },
  ];
  const plan = [];
  const problems = [];
  for (const { table, column } of targets) {
    const { rows } = await client.query(
      `select id, ${column} as url from ${table} where ${column} like $1 order by id`,
      [like]
    );
    for (const r of rows) {
      const m = rewrite(r.url);
      if (!m || m.error) problems.push({ table, column, id: r.id, url: r.url, why: m?.error });
      else plan.push({ table, column, id: r.id, from: r.url, to: m.to });
    }
  }
  return { plan, problems };
}

async function main() {
  console.log(`\n${apply ? "APPLY" : "DRY RUN"} — Supabase Storage -> R2`);
  console.log(`  source: ${SUPABASE_URL}`);
  console.log(`  target: R2 bucket ${process.env.R2_BUCKET ?? "(R2_BUCKET unset)"}\n`);
  if (!haveR2) console.log("  (R2 env not set — skipping existence checks in dry run)\n");

  const totals = { listed: 0, bytes: 0, skipped: 0, copied: 0, wouldCopy: 0, failed: 0 };
  const failures = [];

  for (const bucket of BUCKETS) {
    const objects = await listAll(bucket);
    const bytes = objects.reduce((n, o) => n + (o.size ?? 0), 0);
    totals.listed += objects.length;
    totals.bytes += bytes;
    console.log(`[${bucket}] ${objects.length} object(s), ${human(bytes)}`);

    for (const o of objects) {
      const key = objectKey(o.bucket, o.path);
      try {
        if (haveR2) {
          const existing = await headObject(key);
          if (existing && o.size != null && existing.size === o.size) {
            totals.skipped++;
            console.log(`  = ${key}  (${human(o.size)}, already in R2)`);
            continue;
          }
        }
        if (!apply) {
          totals.wouldCopy++;
          console.log(`  + ${key}  (${human(o.size)}, ${o.contentType ?? "?"})  [dry run]`);
          continue;
        }
        await copyObject(o);
        totals.copied++;
        console.log(`  ✓ ${key}  (${human(o.size)}, ${o.contentType ?? "?"})`);
      } catch (err) {
        totals.failed++;
        failures.push({ key, message: err.message });
        console.error(`  ✗ ${key}: ${err.message}`);
      }
    }
  }

  if (rewriteUrls) {
    console.log("\nURL rewrite (lessons.video_url, lesson_templates.file_url):");
    const client = await db().connect();
    try {
      const { plan, problems } = await planRewrites(client);
      for (const p of plan) {
        console.log(`  ${p.table}.${p.column} ${p.id}\n    ${p.from}\n -> ${p.to}`);
      }
      for (const p of problems) {
        console.log(`  ! ${p.table}.${p.column} ${p.id} left as-is (${p.why}): ${p.url}`);
      }
      console.log(`  ${plan.length} row(s) to rewrite, ${problems.length} skipped.`);

      if (!apply) {
        console.log("  DRY RUN — no rows changed.");
      } else if (failures.length) {
        console.error("  NOT rewriting: some copies failed. Fix and re-run.");
      } else if (plan.length) {
        await client.query("begin");
        try {
          for (const p of plan) {
            await client.query(
              `update ${p.table} set ${p.column} = $1 where id = $2 and ${p.column} = $3`,
              [p.to, p.id, p.from]
            );
          }
          await client.query("commit");
          console.log(`  ✓ rewrote ${plan.length} row(s) in one transaction.`);
        } catch (err) {
          await client.query("rollback");
          throw err;
        }
      }
    } finally {
      client.release();
      await closeDb();
    }
  }

  console.log("\nSummary");
  console.log(`  listed:   ${totals.listed} object(s), ${human(totals.bytes)}`);
  console.log(`  skipped:  ${totals.skipped} (already in R2, same size)`);
  if (apply) console.log(`  copied:   ${totals.copied}`);
  else console.log(`  to copy:  ${totals.wouldCopy}`);
  console.log(`  failed:   ${totals.failed}`);
  for (const f of failures) console.log(`    ${f.key}: ${f.message}`);
  if (!apply) console.log("\nDRY RUN — nothing written. Re-run with --apply to copy.");
  console.log("");
  if (failures.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
