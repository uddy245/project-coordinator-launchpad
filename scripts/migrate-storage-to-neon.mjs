#!/usr/bin/env node
/**
 * One-off: copy the archived Supabase Storage objects into Neon Object
 * Storage, and (optionally) repoint DB URLs at them.
 *
 * The Supabase project is PAUSED, so objects are read from the archive zip,
 * not from Supabase URLs. Expected zip layout: one folder per Supabase bucket
 * (optionally under a single root folder), object paths unchanged below it:
 *
 *   [root/]submissions/<user_id>/<submission_id>.<ext>
 *   [root/]capstone-artifacts/<user_id>/<attempt_id>/<kind>.<ext>
 *   [root/]lesson-templates/…
 *   [root/]lesson-videos/<slug>/<slug>.mp4 (+ .vtt)
 *
 * Each object goes to the Neon bucket of the same name at the same path, so
 * submissions.storage_path and capstone_artifacts.file_path (bucket-relative)
 * need no rewrite. lessons.video_url and lesson_templates.file_url hold
 * absolute Supabase URLs (…/storage/v1/object/public/<bucket>/<path>) and are
 * rewritten to `${AWS_ENDPOINT_URL_S3}/<bucket>/<path>`.
 *
 *   node --env-file=.env.local scripts/migrate-storage-to-neon.mjs                 # dry run
 *   node --env-file=.env.local scripts/migrate-storage-to-neon.mjs --apply         # copy objects
 *   node --env-file=.env.local scripts/migrate-storage-to-neon.mjs --apply --rewrite-urls
 *   … --zip <path>   (default: the 2026-09-22 archive in ~/backups)
 *   … --all          copy every archived object, not just DB-referenced ones
 *
 * Default copy set = objects the DB references: lessons.video_url /
 * lesson_templates.file_url targets, submissions.storage_path,
 * capstone_artifacts.file_path, plus each referenced video's caption
 * (<same path>.vtt — the player derives it). Unreferenced files (e.g. old
 * rollback videos) stay in the zip.
 *
 * Dry run (default): lists files, totals vs the 5 GB free-plan limit, checks
 * DB references against the archive and prints before→after URLs. Writes
 * nothing. --apply is idempotent (skips objects already present with the
 * same size). --rewrite-urls runs only after every copy succeeded, in one
 * transaction, and only updates rows still holding the old URL.
 *
 * Env: DIRECT_URL or DATABASE_URL; AWS_ENDPOINT_URL_S3 (+ AWS_ACCESS_KEY_ID,
 * AWS_SECRET_ACCESS_KEY for --apply).
 */
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { extname, resolve } from "node:path";
import { promisify } from "node:util";
import {
  BUCKETS,
  PUBLIC_BUCKETS,
  closeDb,
  db,
  headObject,
  publicUrl,
  putObject,
  requireEnv,
} from "./lib/neon-storage.mjs";

const run = promisify(execFile);
const args = process.argv.slice(2);
const apply = args.includes("--apply");
const rewrite = args.includes("--rewrite-urls");
// Default: copy only objects the DB references (plus their captions).
const copyAll = args.includes("--all");
const zipArg = args.indexOf("--zip");
const ZIP =
  zipArg !== -1
    ? resolve(args[zipArg + 1])
    : resolve(
        homedir(),
        "backups/supabase-to-neon-2026-09-22/pc-launchpad_supabase-storage_2026-09-22.zip"
      );

const FREE_PLAN_BYTES = 5 * 1000 ** 3; // "5 GB per project"
const SKIP = [/\/$/, /(^|\/)\.emptyFolderPlaceholder$/, /(^|\/)\.DS_Store$/, /^__MACOSX\//];
const MIME = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".vtt": "text/vtt",
  ".srt": "application/x-subrip",
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
  ".csv": "text/csv",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".txt": "text/plain",
};
const SUPABASE_PUBLIC = /\/storage\/v1\/object\/public\/([^/]+)\/(.+?)(?:\?.*)?$/;

const human = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;

/** [{ name, size }] from `unzip -l` (names may contain spaces). */
async function listZip(zip) {
  const { stdout } = await run("unzip", ["-l", zip], { maxBuffer: 256 * 1024 * 1024 });
  const out = [];
  for (const line of stdout.split("\n")) {
    const m = line.match(/^\s*(\d+)\s+\S+\s+\S+\s+(.+)$/);
    if (m && !/^-+$/.test(m[2].trim())) out.push({ name: m[2], size: Number(m[1]) });
  }
  return out;
}

/** Map a zip entry to { bucket, path } — first path segment that is a bucket. */
function mapEntry(name) {
  const parts = name.split("/");
  const i = parts.findIndex((p) => BUCKETS.includes(p));
  if (i === -1 || i > 1 || i === parts.length - 1) return null;
  return { bucket: parts[i], path: parts.slice(i + 1).join("/") };
}

/** unzip treats member names as wildcards; escape them ([ * ? → [x]; ] is literal). */
function literal(name) {
  return name.replace(/[[*?]/g, (c) => `[${c}]`);
}

async function readEntry(zip, name) {
  const { stdout } = await run("unzip", ["-p", zip, literal(name)], {
    encoding: "buffer",
    maxBuffer: 6 * 1024 ** 3,
  });
  return stdout;
}

async function main() {
  console.log(`\n${apply ? "APPLY" : "DRY RUN"}${rewrite ? " + REWRITE URLS" : ""}`);
  console.log(`Archive: ${ZIP}`);
  if (!existsSync(ZIP)) {
    console.error("\nArchive not found — nothing to do yet (pass --zip <path> once it arrives).\n");
    process.exit(2);
  }
  requireEnv(["AWS_ENDPOINT_URL_S3"], "Needed to compute target URLs (see .env.example).");
  if (apply) requireEnv(["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"]);

  // ── 1. Inventory the archive ────────────────────────────────────────────
  const entries = await listZip(ZIP);
  const objects = [];
  const unmapped = [];
  for (const e of entries) {
    if (SKIP.some((re) => re.test(e.name))) continue;
    const m = mapEntry(e.name);
    if (m) objects.push({ ...e, ...m });
    else unmapped.push(e.name);
  }

  const inZip = new Set(objects.map((o) => `${o.bucket}/${o.path}`));

  // ── 2. DB references ────────────────────────────────────────────────────
  const pool = db();
  const { rows: urlRows } = await pool.query(`
    select 'lessons' as tbl, 'video_url' as col, id::text as id, video_url as url from public.lessons
      where video_url like '%/storage/v1/object/public/%'
    union all
    select 'lesson_templates', 'file_url', id::text, file_url from public.lesson_templates
      where file_url like '%/storage/v1/object/public/%'`);
  const rewrites = [];
  const missing = [];
  for (const r of urlRows) {
    const m = decodeURIComponent(r.url).match(SUPABASE_PUBLIC);
    if (!m || !PUBLIC_BUCKETS.includes(m[1])) {
      missing.push(`${r.tbl}.${r.col} ${r.id}: not a public bucket URL — left alone`);
      continue;
    }
    const [, bucket, path] = m;
    if (!inZip.has(`${bucket}/${path}`)) {
      // Never repoint a row at an object we don't have — leave it as-is.
      missing.push(
        `${r.tbl}.${r.col} ${r.id}: ${bucket}/${path} not in archive — URL left unchanged`
      );
      continue;
    }
    rewrites.push({ ...r, bucket, path, next: publicUrl(bucket, path) });
  }

  const { rows: keyRows } = await pool.query(`
    select 'submissions' as bucket, storage_path as path from public.submissions where storage_path <> 'pending'
    union all
    select 'capstone-artifacts', file_path from public.capstone_artifacts`);
  const missingKeys = keyRows.filter((r) => !inZip.has(`${r.bucket}/${r.path}`));

  // ── 3. Choose what to copy ──────────────────────────────────────────────
  // Referenced = DB URL targets + bucket-relative keys + the caption file the
  // video player derives from each video URL (<same path>.vtt).
  const referenced = new Set();
  const captions = new Set();
  for (const r of rewrites) {
    referenced.add(`${r.bucket}/${r.path}`);
    const vtt = `${r.bucket}/${r.path.replace(/\.mp4$/i, ".vtt")}`;
    if (vtt !== `${r.bucket}/${r.path}` && inZip.has(vtt)) {
      referenced.add(vtt);
      captions.add(vtt);
    }
  }
  for (const r of keyRows) referenced.add(`${r.bucket}/${r.path}`);
  const selected = copyAll
    ? objects
    : objects.filter((o) => referenced.has(`${o.bucket}/${o.path}`));
  const unreferenced = objects.filter((o) => !referenced.has(`${o.bucket}/${o.path}`));

  const sum = (list) => list.reduce((n, o) => n + o.size, 0);
  const total = sum(selected);
  const archiveTotal = sum(objects);

  console.log(`
Archive: ${objects.length} objects, ${human(archiveTotal)}   (zip entries: ${entries.length})`);
  console.log(
    `
Copy plan (${copyAll ? "--all" : "referenced only — default"}): ${selected.length} files`
  );
  for (const b of BUCKETS) {
    const inB = selected.filter((o) => o.bucket === b);
    const access = PUBLIC_BUCKETS.includes(b) ? "public_read" : "private";
    console.log(
      `  ${b.padEnd(20)} ${access.padEnd(12)} ${String(inB.length).padStart(5)} files  ${human(sum(inB)).padStart(10)}`
    );
  }
  console.log(
    `  ${"TOTAL".padEnd(33)} ${String(selected.length).padStart(5)} files  ${human(total).padStart(10)}`
  );
  if (!copyAll) {
    console.log(
      `  (includes ${captions.size} caption .vtt files derived from video URLs; ` +
        `skips ${unreferenced.length} unreferenced files, ${human(sum(unreferenced))} — they stay in the zip)`
    );
  }
  const pct = ((total / FREE_PLAN_BYTES) * 100).toFixed(1);
  console.log(
    `\n5 GB free-plan limit: ${pct}% used by this copy${total > FREE_PLAN_BYTES ? "  ⚠ OVER LIMIT" : ""}`
  );
  if (unmapped.length) {
    console.log(`\n⚠ ${unmapped.length} entries are not under a known bucket folder (skipped):`);
    for (const n of unmapped.slice(0, 20)) console.log(`    ${n}`);
  }
  if (args.includes("--list")) {
    console.log("\nFiles to copy:");
    for (const o of selected) console.log(`  ${o.bucket}/${o.path}  ${human(o.size)}`);
    if (!copyAll && unreferenced.length) {
      console.log("\nSkipped (unreferenced):");
      for (const o of unreferenced) console.log(`  ${o.bucket}/${o.path}  ${human(o.size)}`);
    }
  }

  console.log(`\nDB URL rewrites (${rewrites.length}):`);
  for (const r of rewrites)
    console.log(`  ${r.tbl}.${r.col} ${r.id}\n      ${r.url}\n   -> ${r.next}`);
  console.log(
    `\nBucket-relative keys (no rewrite needed): ${keyRows.length} referenced, ${missingKeys.length} missing from archive`
  );
  for (const r of missingKeys.slice(0, 20)) console.log(`    missing: ${r.bucket}/${r.path}`);
  for (const m of missing) console.log(`  ⚠ ${m}`);

  if (!apply) {
    console.log(
      `\nDRY RUN — nothing copied or changed.${rewrite ? " (--rewrite-urls previewed above)" : ""}\n`
    );
    return;
  }

  // ── 4. Copy ─────────────────────────────────────────────────────────────
  if (total > FREE_PLAN_BYTES) {
    console.error("\nAbort: copy exceeds the 5 GB free-plan limit.");
    process.exit(1);
  }
  let copied = 0;
  let skipped = 0;
  const failed = [];
  for (const o of selected) {
    try {
      const existing = await headObject(o.bucket, o.path);
      if (existing && existing.size === o.size) {
        skipped++;
        continue;
      }
      const body = await readEntry(ZIP, o.name);
      const type = MIME[extname(o.path).toLowerCase()] ?? "application/octet-stream";
      await putObject(o.bucket, o.path, body, type, body.length);
      copied++;
      console.log(`  ✓ ${o.bucket}/${o.path}`);
    } catch (err) {
      failed.push(`${o.bucket}/${o.path}: ${err?.message ?? err}`);
      console.error(`  ✗ ${o.bucket}/${o.path}: ${err?.message ?? err}`);
    }
  }
  console.log(`\nCopied ${copied}, already present ${skipped}, failed ${failed.length}.`);

  // ── 5. Rewrite URLs ─────────────────────────────────────────────────────
  if (!rewrite) return;
  if (failed.length) {
    console.error("Not rewriting URLs: some copies failed. Re-run --apply first.");
    process.exit(1);
  }
  const client = await pool.connect();
  try {
    await client.query("begin");
    let n = 0;
    for (const r of rewrites) {
      const res = await client.query(
        `update public.${r.tbl} set ${r.col} = $1 where id = $2 and ${r.col} = $3`,
        [r.next, r.id, r.url]
      );
      n += res.rowCount;
    }
    await client.query("commit");
    console.log(`Rewrote ${n} URL(s).`);
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(closeDb);
