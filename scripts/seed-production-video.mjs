/**
 * Idempotent production seed: publish a narrated-slides lesson video.
 *
 * Uploads the lesson MP4 (and, where the bucket allows it, captions.srt) to the
 * public `lesson-videos` Supabase Storage bucket, then sets lessons.video_url +
 * is_published for the lesson slug. Safe to re-run: storage uploads upsert and
 * the row update is a fixed target.
 *
 *   # Dry run (default): connect, print current -> target, change NOTHING.
 *   node --env-file=.env.local scripts/seed-production-video.mjs lesson-20-raid-logs
 *   # Apply for real:
 *   node --env-file=.env.local scripts/seed-production-video.mjs lesson-20-raid-logs --apply
 *
 * Slug mapping: the pipeline folder is `lesson-20-raid-logs`; the lessons row
 * slug is `raid-logs`. Pass the pipeline slug; LESSON_SLUG maps it to the row.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");

const BUCKET = "lesson-videos";
// Pipeline folder slug -> lessons table slug.
const LESSON_SLUG = { "lesson-20-raid-logs": "raid-logs" };

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const pipelineSlug = args.find((a) => !a.startsWith("-")) ?? "lesson-20-raid-logs";
const rowSlug = LESSON_SLUG[pipelineSlug] ?? pipelineSlug;

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !SERVICE) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.");
  console.error("Run with: node --env-file=.env.local scripts/seed-production-video.mjs");
  process.exit(1);
}

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

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
const publicUrl = admin.storage.from(BUCKET).getPublicUrl(mp4Key).data.publicUrl;

function human(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function main() {
  if (!mp4Path) {
    console.error(`No MP4 found for ${pipelineSlug} (looked in repo + video-production).`);
    process.exit(1);
  }

  const { data: lesson, error } = await admin
    .from("lessons")
    .select("id, slug, title, video_url, is_published")
    .eq("slug", rowSlug)
    .maybeSingle();
  if (error) {
    console.error("Query failed:", error.message);
    process.exit(1);
  }
  if (!lesson) {
    console.error(`No lessons row with slug "${rowSlug}".`);
    process.exit(1);
  }

  console.log(`\n  Lesson:        ${lesson.title}  (slug=${lesson.slug}, id=${lesson.id})`);
  console.log(`  MP4:           ${mp4Path}  (${human(statSync(mp4Path).size)})`);
  console.log(`  -> bucket:     ${BUCKET}/${mp4Key}`);
  console.log(
    `  captions.srt:  ${srtPath ?? "(not found)"}  (repo-only; bucket is video/* — not uploaded)`
  );
  console.log(`\n  video_url:     ${lesson.video_url ?? "(null)"}`);
  console.log(`            ->   ${publicUrl}`);
  console.log(`  is_published:  ${lesson.is_published}  ->  true`);

  if (lesson.video_url === publicUrl && lesson.is_published === true) {
    console.log("\n  Already at target. (Storage upload still upserts on --apply.)");
  }

  if (!apply) {
    console.log("\n  DRY RUN — nothing changed. Re-run with --apply to publish.\n");
    return;
  }

  console.log("\n  Applying...");

  // 1. Upload MP4 (upsert).
  const up = await admin.storage.from(BUCKET).upload(mp4Key, readFileSync(mp4Path), {
    contentType: "video/mp4",
    upsert: true,
  });
  if (up.error) {
    console.error("  MP4 upload failed:", up.error.message);
    process.exit(1);
  }
  console.log(`  ✓ uploaded ${mp4Key}`);

  // captions.srt is intentionally NOT uploaded: the lesson-videos bucket
  // allows video/* only, and nothing in the player consumes an SRT yet. It
  // stays committed in the repo for when a <track> element is wired up.

  // 2. Publish the row.
  const upd = await admin
    .from("lessons")
    .update({ video_url: publicUrl, is_published: true })
    .eq("slug", rowSlug);
  if (upd.error) {
    console.error("  Row update failed:", upd.error.message);
    process.exit(1);
  }

  const { data: after } = await admin
    .from("lessons")
    .select("video_url, is_published")
    .eq("slug", rowSlug)
    .maybeSingle();
  console.log(
    `  ✓ lessons.${rowSlug}: video_url=${after?.video_url}, is_published=${after?.is_published}`
  );
  console.log("\n  Done.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
