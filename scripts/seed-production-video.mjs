/**
 * Idempotent production seed: publish a narrated-slides lesson video.
 *
 * Uploads the lesson MP4 to the public_read `lesson-videos` Neon bucket
 * (nested key `lesson-videos/<slug>/<slug>.mp4`, so any prior root-key object is
 * preserved as rollback), then repoints lessons.video_url to the app URL
 * `${AWS_ENDPOINT_URL_S3}/lesson-videos/<slug>/<slug>.mp4`.
 * is_published is left untouched unless --publish is passed. Safe to re-run:
 * the storage put overwrites, row is a fixed target.
 *
 * Three modes:
 *
 *   # Offline dry run: print what would be published. No database, no storage,
 *   # no credentials, no --env-file needed. Wins over --apply if both are passed.
 *   node scripts/seed-production-video.mjs lesson-20-raid-logs --dry-run
 *   # Preview (default): read the lessons row, print current -> target, change NOTHING.
 *   node --env-file=.env.local scripts/seed-production-video.mjs lesson-20-raid-logs
 *   # Apply (repoint video_url only; leave is_published as-is):
 *   node --env-file=.env.local scripts/seed-production-video.mjs lesson-01-coordinator-role --apply
 *   # Apply and also publish the lesson:
 *   node --env-file=.env.local scripts/seed-production-video.mjs lesson-20-raid-logs --apply --publish
 *
 * Env (preview/apply): DIRECT_URL or DATABASE_URL (Neon), AWS_ENDPOINT_URL_S3; on
 * --apply also AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY (Neon storage).
 *
 * Slug mapping: pass the pipeline folder name (`lesson-20-raid-logs`). The row
 * slug and the storage key both use the lesson slug (`raid-logs`), derived by
 * scripts/lib/lesson-slug.mjs — the same slug as docs/lessons/<slug>.md. Note
 * lesson 17: folder `lesson-17-pushback`, slug `push-back`.
 */
import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  closeDb,
  db,
  objectKey,
  publicUrl as appUrl,
  putObject,
  requireEnv,
} from "./lib/neon-storage.mjs";
import { lessonVideoKey, parsePipelineSlug } from "./lib/lesson-slug.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");

const BUCKET = "lesson-videos";

const args = process.argv.slice(2);
// --dry-run is fully offline and wins over --apply, so adding it to any
// command line makes that command safe.
const dryRun = args.includes("--dry-run");
const apply = args.includes("--apply") && !dryRun;
// is_published is left untouched unless --publish is passed, so re-seeding a
// video never silently flips a lesson's published state in either direction.
const publish = args.includes("--publish");

const unknown = args.filter(
  (a) => a.startsWith("-") && !["--apply", "--publish", "--dry-run"].includes(a)
);
if (unknown.length) {
  // A mistyped flag (e.g. --dryrun) must never fall through to a live mode.
  console.error(`Unknown option: ${unknown.join(", ")}. Use --dry-run, --apply, --publish.`);
  process.exit(1);
}

let lessonRef;
try {
  lessonRef = parsePipelineSlug(args.find((a) => !a.startsWith("-")) ?? "lesson-20-raid-logs");
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
const { pipelineSlug, slug: rowSlug } = lessonRef;

// The lesson slug must match a reading in docs/lessons/ — that file name is
// the same slug the lessons row and the /lessons/<slug> route use.
if (!existsSync(resolve(REPO, "docs/lessons", `${rowSlug}.md`))) {
  console.error(
    `No docs/lessons/${rowSlug}.md for ${pipelineSlug}. If the folder name and the lesson slug differ, add it to SLUG_OVERRIDE in scripts/lib/lesson-slug.mjs.`
  );
  process.exit(1);
}

const HINT = "Run with: node --env-file=.env.local scripts/seed-production-video.mjs";
if (!dryRun) {
  if (!process.env.DIRECT_URL && !process.env.DATABASE_URL) {
    console.error("Missing DIRECT_URL / DATABASE_URL.");
    console.error(HINT);
    process.exit(1);
  }
  requireEnv(["AWS_ENDPOINT_URL_S3"], HINT);
  if (apply) {
    requireEnv(["AWS_ENDPOINT_URL_S3", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"], HINT);
  }
}

// Resolve artifacts: prefer the in-repo pipeline output, fall back to the
// out-of-repo video-production folder where the validated build lives.
function locate(name) {
  const candidates = [
    resolve(REPO, "scripts/video/lessons", pipelineSlug, name),
    resolve(REPO, "..", "video-production", pipelineSlug, name),
  ];
  return candidates.find(existsSync) ?? null;
}

const mp4Path = locate(`${pipelineSlug}.mp4`);
const srtPath = locate("captions.srt");
const vttPath = locate("captions.vtt");
// Storage key uses the lesson slug, not the pipeline folder name.
const mp4Key = lessonVideoKey(rowSlug, "mp4");
// Offline dry run must not need the storage endpoint; show it symbolically.
const publicUrl = dryRun
  ? `\${AWS_ENDPOINT_URL_S3}/${objectKey(BUCKET, mp4Key)}`
  : appUrl(BUCKET, mp4Key);

function human(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function printDryRun() {
  console.log(`\n  DRY RUN (offline) — ${pipelineSlug}`);
  console.log("  No database or storage connection is made. Nothing is uploaded or changed.\n");
  console.log(`  Lesson slug:   ${rowSlug}  (docs/lessons/${rowSlug}.md)`);
  console.log(
    `  MP4:           ${mp4Path ? `${mp4Path}  (${human(statSync(mp4Path).size)})` : "(NOT FOUND — --apply would abort)"}`
  );
  console.log(`  -> storage:     ${objectKey(BUCKET, mp4Key)}`);
  console.log(`  video_url:     -> ${publicUrl}`);
  console.log(`                 (lessons row where slug = "${rowSlug}")`);
  console.log(
    `  is_published:  ${publish ? "would be set to true  (--publish)" : "unchanged  (no --publish)"}`
  );
  console.log(`  captions.srt:  ${srtPath ?? "(not found)"}  (repo-only — never uploaded)`);
  console.log(
    `  captions.vtt:  ${vttPath ?? "(not found)"}  (not uploaded by this script; upload-captions.mjs puts it at ${objectKey(BUCKET, lessonVideoKey(rowSlug, "vtt"))})`
  );
  console.log("\n  DRY RUN — nothing uploaded, nothing changed.\n");
}

async function main() {
  if (dryRun) {
    printDryRun();
    return;
  }

  if (!mp4Path) {
    console.error(`No MP4 found for ${pipelineSlug} (looked in repo + video-production).`);
    process.exit(1);
  }

  let lesson;
  try {
    const { rows } = await db().query(
      "select id, slug, title, video_url, is_published from lessons where slug = $1",
      [rowSlug]
    );
    lesson = rows[0];
  } catch (error) {
    console.error("Query failed:", error.message);
    process.exit(1);
  }
  if (!lesson) {
    console.error(`No lessons row with slug "${rowSlug}".`);
    process.exit(1);
  }

  console.log(`\n  Lesson:        ${lesson.title}  (slug=${lesson.slug}, id=${lesson.id})`);
  console.log(`  MP4:           ${mp4Path}  (${human(statSync(mp4Path).size)})`);
  console.log(`  -> storage:     ${objectKey(BUCKET, mp4Key)}`);
  console.log(`  captions.srt:  ${srtPath ?? "(not found)"}  (repo-only — not uploaded)`);
  const targetPublished = publish ? true : lesson.is_published;
  console.log(`\n  video_url:     ${lesson.video_url ?? "(null)"}`);
  console.log(`            ->   ${publicUrl}`);
  console.log(
    `  is_published:  ${lesson.is_published}  ->  ${targetPublished}` +
      (publish ? "  (--publish)" : "  (unchanged)")
  );

  if (lesson.video_url === publicUrl && lesson.is_published === targetPublished) {
    console.log("\n  Already at target. (Storage upload still upserts on --apply.)");
  }

  if (!apply) {
    console.log("\n  PREVIEW — nothing changed. Re-run with --apply to publish.\n");
    return;
  }

  console.log("\n  Applying...");

  // 1. Upload MP4 (storage put overwrites).
  try {
    await putObject(BUCKET, mp4Key, readFileSync(mp4Path), "video/mp4");
  } catch (error) {
    console.error("  MP4 upload failed:", error.message);
    process.exit(1);
  }
  console.log(`  ✓ uploaded ${mp4Key}`);

  // captions.srt is intentionally NOT uploaded: nothing in the player
  // consumes an SRT (captions are WebVTT, see upload-captions.mjs). It stays
  // committed in the repo.

  // 2. Update the row. video_url always; is_published only with --publish.
  let after;
  try {
    const { rows } = await db().query(
      publish
        ? "update lessons set video_url = $1, is_published = true where slug = $2 returning video_url, is_published"
        : "update lessons set video_url = $1 where slug = $2 returning video_url, is_published",
      [publicUrl, rowSlug]
    );
    after = rows[0];
  } catch (error) {
    console.error("  Row update failed:", error.message);
    process.exit(1);
  }
  console.log(
    `  ✓ lessons.${rowSlug}: video_url=${after?.video_url}, is_published=${after?.is_published}`
  );
  console.log("\n  Done.\n");
}

main()
  .then(() => closeDb())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
