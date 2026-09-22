/**
 * Upload WebVTT caption files to the public_read lesson-videos Neon bucket.
 *
 * For each video-production/lesson-NN-<slug>/ folder: uploads captions.vtt
 * at key lesson-videos/<dbSlug>/<dbSlug>.vtt, so the video-player's caption URL
 * derivation (<videoUrl>.mp4 -> .vtt) resolves to the same object (bucket sends CORS *, so <track crossOrigin> works).
 *
 *   # Dry run (default): print the 25-row plan, change NOTHING.
 *   node --env-file=.env.local scripts/upload-captions.mjs
 *   # Apply:
 *   node --env-file=.env.local scripts/upload-captions.mjs --apply
 *
 * Env (--apply only): AWS_ENDPOINT_URL_S3 / AWS_ACCESS_KEY_ID /
 * AWS_SECRET_ACCESS_KEY (Neon storage). No per-bucket MIME allow-list to migrate.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { objectKey, putObject, requireEnv } from "./lib/neon-storage.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");
const VP = resolve(REPO, "..", "video-production");
const BUCKET = "lesson-videos";

// Folder-derived slug -> DB slug, where folder name doesn't match the row.
// Keep in sync with seed-all-lesson-videos.mjs.
const SLUG_OVERRIDE = { pushback: "push-back" };

const apply = process.argv.includes("--apply");

if (apply) {
  requireEnv(
    ["AWS_ENDPOINT_URL_S3", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"],
    "Run with: node --env-file=.env.local scripts/upload-captions.mjs --apply"
  );
}

const folders = readdirSync(VP)
  .filter((f) => /^lesson-\d+-/.test(f))
  .sort();

const entries = folders.map((f) => {
  const m = f.match(/^lesson-(\d+)-(.+)$/);
  const number = parseInt(m[1], 10);
  const folderSlug = m[2];
  const dbSlug = SLUG_OVERRIDE[folderSlug] ?? folderSlug;
  const vttLocal = resolve(VP, f, "captions.vtt");
  const key = `${dbSlug}/${dbSlug}.vtt`;
  return { f, number, folderSlug, dbSlug, vttLocal, key, hasVtt: existsSync(vttLocal) };
});

console.log(`\n${apply ? "APPLY" : "DRY RUN"} — ${entries.length} captions.vtt files\n`);
console.log(" n  dbSlug                      vtt   storage key");
console.log(" -  ------                      ---   ------");

let missing = 0;
for (const e of entries) {
  const mark = e.hasVtt ? "Y  " : "NO ";
  if (!e.hasVtt) missing++;
  const slugNote = e.folderSlug !== e.dbSlug ? ` (folder:${e.folderSlug})` : "";
  console.log(
    ` ${String(e.number).padStart(2)} ${e.dbSlug.padEnd(27)} ${mark} ${objectKey(BUCKET, e.key)}${slugNote}`
  );
}

console.log(`\ncaptions.vtt present: ${entries.length - missing}/${entries.length}`);
if (missing) {
  console.log(`\n⚠ ${missing} folder(s) missing captions.vtt — will abort on --apply.`);
}

if (!apply) {
  console.log("\nDRY RUN — nothing uploaded. Re-run with --apply to upload.\n");
  process.exit(0);
}

if (missing) {
  console.error(`\nAbort: ${missing} captions.vtt file(s) missing.`);
  process.exit(1);
}

console.log("\nUploading...");
let ok = 0;
for (const e of entries) {
  try {
    await putObject(BUCKET, e.key, readFileSync(e.vttLocal), "text/vtt");
  } catch (error) {
    console.error(`  ${e.dbSlug}: upload failed: ${error.message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${objectKey(BUCKET, e.key)}`);
  ok++;
}
console.log(`\nDone. ${ok}/${entries.length} captions.vtt uploaded.\n`);
