/**
 * Idempotent production seed: publish a narrated-slides lesson video.
 *
 * Uploads the lesson MP4 to R2 under the public `lesson-videos/` prefix
 * (nested key `lesson-videos/<slug>/<slug>.mp4`, so any prior root-key object is
 * preserved as rollback), then repoints lessons.video_url to the app URL
 * `${NEXT_PUBLIC_APP_URL}/api/files/lesson-videos/<slug>/<slug>.mp4`.
 * is_published is left untouched unless --publish is passed. Safe to re-run:
 * the R2 put overwrites, row is a fixed target.
 *
 * Env: DIRECT_URL or DATABASE_URL (Neon), NEXT_PUBLIC_APP_URL; on --apply also
 * R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET.
 *
 *   # Dry run (default): connect, print current -> target, change NOTHING.
 *   node --env-file=.env.local scripts/seed-production-video.mjs lesson-20-raid-logs
 *   # Apply (repoint video_url only; leave is_published as-is):
 *   node --env-file=.env.local scripts/seed-production-video.mjs lesson-01-coordinator-role --apply
 *   # Apply and also publish the lesson:
 *   node --env-file=.env.local scripts/seed-production-video.mjs lesson-20-raid-logs --apply --publish
 *
 * Slug mapping: the pipeline folder is `lesson-20-raid-logs`; the lessons row
 * slug is `raid-logs`. Pass the pipeline slug; LESSON_SLUG maps it to the row.
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
} from "./lib/neon-r2.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");

const BUCKET = "lesson-videos";
// Pipeline folder slug -> lessons table slug.
const LESSON_SLUG = {
  "lesson-20-raid-logs": "raid-logs",
  "lesson-01-coordinator-role": "coordinator-role",
};

const args = process.argv.slice(2);
const apply = args.includes("--apply");
// is_published is left untouched unless --publish is passed, so re-seeding a
// video never silently flips a lesson's published state in either direction.
const publish = args.includes("--publish");
const pipelineSlug = args.find((a) => !a.startsWith("-")) ?? "lesson-20-raid-logs";
const rowSlug = LESSON_SLUG[pipelineSlug] ?? pipelineSlug;

const HINT = "Run with: node --env-file=.env.local scripts/seed-production-video.mjs";
if (!process.env.DIRECT_URL && !process.env.DATABASE_URL) {
  console.error("Missing DIRECT_URL / DATABASE_URL.");
  console.error(HINT);
  process.exit(1);
}
requireEnv(["NEXT_PUBLIC_APP_URL"], HINT);
if (apply) {
  requireEnv(["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"], HINT);
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
const mp4Key = `${pipelineSlug}/${pipelineSlug}.mp4`;
const publicUrl = appUrl(BUCKET, mp4Key);

function human(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function main() {
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
  console.log(`  -> R2 key:     ${objectKey(BUCKET, mp4Key)}`);
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
    console.log("\n  DRY RUN — nothing changed. Re-run with --apply to publish.\n");
    return;
  }

  console.log("\n  Applying...");

  // 1. Upload MP4 (R2 put overwrites).
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
