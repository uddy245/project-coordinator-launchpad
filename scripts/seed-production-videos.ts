#!/usr/bin/env tsx
/**
 * Idempotent seed: sets video_url for all 25 published lessons.
 *
 * R2 layout:   lesson-videos/<slug>/<slug>.mp4  (key prefix in R2_BUCKET)
 * Stored URL:  ${NEXT_PUBLIC_APP_URL}/api/files/lesson-videos/<slug>/<slug>.mp4
 * Special case: folder lesson-17-pushback → DB slug "push-back"
 *
 * Only repoints DB rows — it does not upload anything (see
 * seed-all-lesson-videos.mjs for upload + repoint).
 *
 * Usage:
 *   DATABASE_URL=postgres://... NEXT_PUBLIC_APP_URL=https://... tsx scripts/seed-production-videos.ts
 *   (DIRECT_URL is preferred over DATABASE_URL when set.)
 *
 * Safe to re-run — plain UPDATE constrained to the slug list.
 */

import { closeDb, db, publicUrl, requireEnv } from "./lib/neon-r2.mjs";

if (!process.env.DIRECT_URL && !process.env.DATABASE_URL) {
  console.error("Set DIRECT_URL or DATABASE_URL, and NEXT_PUBLIC_APP_URL");
  process.exit(1);
}
requireEnv(["NEXT_PUBLIC_APP_URL"]);

// All 25 lessons: DB slug → bucket key (identical except push-back which
// maps from folder lesson-17-pushback but the DB slug is "push-back").
const LESSONS: string[] = [
  "coordinator-role",
  "mindset",
  "written-voice",
  "project-lifecycle",
  "methodologies",
  "governance",
  "variables",
  "requirements-literacy",
  "wbs",
  "schedules",
  "meetings",
  "minutes",
  "status-reports",
  "change-requests",
  "dashboards",
  "escalation",
  "push-back",
  "chasing",
  "reading-the-room",
  "raid-logs",
  "stakeholder-relationships",
  "vendors",
  "remote-hybrid",
  "using-ai",
  "coordinator-to-pm",
];

type Row = { slug: string; video_url: string | null };

async function main() {
  let ok = 0;
  let fail = 0;

  for (const slug of LESSONS) {
    const url = publicUrl("lesson-videos", `${slug}/${slug}.mp4`);
    try {
      await db().query("update lessons set video_url = $1 where slug = $2", [url, slug]);
      console.log(`OK    ${slug}`);
      ok++;
    } catch (error) {
      console.error(`FAIL  ${slug}  ${(error as Error).message}`);
      fail++;
    }
  }

  console.log(`\n${ok}/${LESSONS.length} updated. ${fail} failures.`);

  // Assertive verification: every row must match the new nested pattern.
  let data: Row[];
  try {
    const res = await db().query(
      "select slug, video_url from lessons where slug = any($1::text[])",
      [LESSONS]
    );
    data = res.rows as Row[];
  } catch (verifyErr) {
    console.error("Verify query failed:", (verifyErr as Error).message);
    process.exit(1);
  }

  const misses = data.filter(
    (r) => !r.video_url?.includes(`/lesson-videos/${r.slug}/${r.slug}.mp4`)
  );

  if (misses.length === 0) {
    console.log(`\n✓ ${LESSONS.length}/${LESSONS.length} rows on new paths — 0 exceptions`);
  } else {
    console.error(`\n✗ ${misses.length} row(s) NOT on new path:`);
    for (const r of misses) console.error(`  ${r.slug}  →  ${r.video_url ?? "NULL"}`);
    process.exit(1);
  }
}

main()
  .then(() => closeDb())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
