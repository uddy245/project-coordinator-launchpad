/**
 * Batch: publish all narrated-slides lesson videos.
 *
 * For each video-production/lesson-NN-<slug>/ folder: uploads the MP4 to R2 at
 * the nested key lesson-videos/<dbSlug>/<dbSlug>.mp4 (preserving any existing
 * root-key video as rollback) and repoints lessons.video_url to the app URL
 * ${NEXT_PUBLIC_APP_URL}/api/files/lesson-videos/<dbSlug>/<dbSlug>.mp4. Does NOT
 * change is_published. If a lesson row is missing, it is NOT silently created —
 * the script reports it so the row can be seeded deliberately (with grading).
 *
 *   # Dry run (default): print the full 25-row diff, change NOTHING.
 *   node --env-file=.env.local scripts/seed-all-lesson-videos.mjs
 *   # Apply:
 *   node --env-file=.env.local scripts/seed-all-lesson-videos.mjs --apply
 *
 * Env: DIRECT_URL or DATABASE_URL (Neon), NEXT_PUBLIC_APP_URL; on --apply also
 * R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { closeDb, db, publicUrl as appUrl, putObject, requireEnv } from "./lib/neon-r2.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");
const VP = resolve(REPO, "..", "video-production");
const BUCKET = "lesson-videos";

// Folder-derived slug -> DB slug, where the folder name doesn't match the row.
const SLUG_OVERRIDE = { pushback: "push-back" };

const apply = process.argv.includes("--apply");

if (!process.env.DIRECT_URL && !process.env.DATABASE_URL) {
  console.error("Missing DIRECT_URL / DATABASE_URL.");
  process.exit(1);
}
requireEnv(["NEXT_PUBLIC_APP_URL"]);
if (apply) requireEnv(["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"]);

const tail = (u) => (u ? (u.split("/lesson-videos/")[1] ?? u) : "(null)");

const folders = readdirSync(VP)
  .filter((f) => /^lesson-\d+-/.test(f))
  .sort();

const entries = folders.map((f) => {
  const m = f.match(/^lesson-(\d+)-(.+)$/);
  const number = parseInt(m[1], 10);
  const folderSlug = m[2];
  const dbSlug = SLUG_OVERRIDE[folderSlug] ?? folderSlug;
  const mp4 = resolve(VP, f, `${f}.mp4`);
  const key = `${dbSlug}/${dbSlug}.mp4`;
  const publicUrl = appUrl(BUCKET, key);
  return { f, number, folderSlug, dbSlug, mp4, key, publicUrl, hasMp4: existsSync(mp4) };
});

let lessons;
try {
  ({ rows: lessons } = await db().query(
    "select id, number, slug, title, is_published, video_url from lessons"
  ));
} catch (error) {
  console.error("Query failed:", error.message);
  process.exit(1);
}
const bySlug = Object.fromEntries(lessons.map((l) => [l.slug, l]));

console.log(`\n${apply ? "APPLY" : "DRY RUN"} — ${entries.length} folders\n`);
console.log(
  "n  dbSlug                      row  pub   mp4  video_url (current -> target nested key)"
);
let missing = 0,
  noMp4 = 0,
  changes = 0;
for (const e of entries) {
  const row = bySlug[e.dbSlug];
  e.row = row;
  const rowMark = row ? "ok " : "NEW";
  const pub = row ? String(row.is_published) : "-";
  const cur = row ? tail(row.video_url) : "-";
  const willChange = row && row.video_url !== e.publicUrl;
  if (!row) missing++;
  if (!e.hasMp4) noMp4++;
  if (willChange) changes++;
  const slugMark = e.folderSlug !== e.dbSlug ? ` (folder:${e.folderSlug})` : "";
  console.log(
    `${String(e.number).padStart(2)} ${e.dbSlug.padEnd(27)} ${rowMark} ${pub.padEnd(5)} ${(e.hasMp4 ? "Y" : "NO").padEnd(3)} ${cur}`
  );
  console.log(`     -> ${tail(e.publicUrl)}${slugMark}${willChange ? "" : "   (no change)"}`);
}
console.log(
  `\nrows: ${entries.length - missing} exist, ${missing} missing | mp4 present: ${entries.length - noMp4}/${entries.length} | video_url changes: ${changes}`
);
console.log("is_published: UNCHANGED for all (no --publish path here).");

if (missing) {
  console.log(
    `\n⚠ ${missing} lesson(s) have no DB row — NOT auto-created. Seed them with grading first.`
  );
}

if (!apply) {
  console.log("\nDRY RUN — nothing changed. Re-run with --apply to upload + repoint.\n");
  await closeDb();
  process.exit(0);
}

if (noMp4) {
  console.error(`\nAbort: ${noMp4} folder(s) missing their MP4.`);
  process.exit(1);
}
if (missing) {
  console.error(`\nAbort: ${missing} lesson row(s) missing. Resolve before applying.`);
  process.exit(1);
}

console.log("\nApplying...");
for (const e of entries) {
  try {
    await putObject(BUCKET, e.key, readFileSync(e.mp4), "video/mp4");
  } catch (error) {
    console.error(`  ${e.dbSlug}: upload failed: ${error.message}`);
    process.exit(1);
  }
  try {
    await db().query("update lessons set video_url = $1 where slug = $2", [e.publicUrl, e.dbSlug]);
  } catch (error) {
    console.error(`  ${e.dbSlug}: row update failed: ${error.message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${e.dbSlug}: uploaded + video_url set`);
}
console.log("\nDone. is_published left untouched for all lessons.\n");
await closeDb();
