/**
 * Upload WebVTT caption files to the lesson-videos Supabase bucket.
 *
 * For each video-production/lesson-NN-<slug>/ folder: uploads captions.vtt
 * at key <dbSlug>/<dbSlug>.vtt, so the video-player's caption URL derivation
 * (<videoUrl>.mp4 -> .vtt) resolves to the same object.
 *
 *   # Dry run (default): print the 25-row plan, change NOTHING.
 *   node --env-file=.env.local scripts/upload-captions.mjs
 *   # Apply:
 *   node --env-file=.env.local scripts/upload-captions.mjs --apply
 *
 * Prerequisites: run the migration (20260625_lesson_videos_vtt_mime.sql) first
 * to add text/vtt to the bucket's allowed_mime_types.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");
const VP = resolve(REPO, "..", "video-production");
const BUCKET = "lesson-videos";

// Folder-derived slug -> DB slug, where folder name doesn't match the row.
// Keep in sync with seed-all-lesson-videos.mjs.
const SLUG_OVERRIDE = { pushback: "push-back" };

const apply = process.argv.includes("--apply");

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !SERVICE) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.");
  console.error("Run with: node --env-file=.env.local scripts/upload-captions.mjs");
  process.exit(1);
}
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

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
  const publicUrl = admin.storage.from(BUCKET).getPublicUrl(key).data.publicUrl;
  return { f, number, folderSlug, dbSlug, vttLocal, key, publicUrl, hasVtt: existsSync(vttLocal) };
});

console.log(`\n${apply ? "APPLY" : "DRY RUN"} — ${entries.length} captions.vtt files\n`);
console.log(" n  dbSlug                      vtt   bucket key");
console.log(" -  ------                      ---   ----------");

let missing = 0;
for (const e of entries) {
  const mark = e.hasVtt ? "Y  " : "NO ";
  if (!e.hasVtt) missing++;
  const slugNote = e.folderSlug !== e.dbSlug ? ` (folder:${e.folderSlug})` : "";
  console.log(
    ` ${String(e.number).padStart(2)} ${e.dbSlug.padEnd(27)} ${mark} ${e.key}${slugNote}`
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
  const up = await admin.storage.from(BUCKET).upload(e.key, readFileSync(e.vttLocal), {
    contentType: "text/vtt",
    upsert: true,
  });
  if (up.error) {
    console.error(`  ${e.dbSlug}: upload failed: ${up.error.message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${e.key}`);
  ok++;
}
console.log(`\nDone. ${ok}/${entries.length} captions.vtt uploaded.\n`);
