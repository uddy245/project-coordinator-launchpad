#!/usr/bin/env tsx
/**
 * Idempotent seed: sets video_url for all 25 published lessons.
 *
 * Bucket layout: lesson-videos/<slug>/<slug>.mp4
 * Special case:  folder lesson-17-pushback → DB slug "push-back"
 *
 * Usage:
 *   SUPABASE_URL=https://... SUPABASE_SERVICE_ROLE_KEY=... tsx scripts/seed-production-videos.ts
 *
 * Safe to re-run — uses UPSERT-style UPDATE constrained to the slug list.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const BASE = `${SUPABASE_URL}/storage/v1/object/public/lesson-videos`;

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

async function main() {
  let ok = 0;
  let fail = 0;

  for (const slug of LESSONS) {
    const url = `${BASE}/${slug}/${slug}.mp4`;
    const { error } = await supabase
      .from("lessons")
      .update({ video_url: url })
      .eq("slug", slug);

    if (error) {
      console.error(`FAIL  ${slug}  ${error.message}`);
      fail++;
    } else {
      console.log(`OK    ${slug}`);
      ok++;
    }
  }

  console.log(`\n${ok}/${LESSONS.length} updated. ${fail} failures.`);

  // Assertive verification: every row must match the new nested pattern.
  const { data, error: verifyErr } = await supabase
    .from("lessons")
    .select("slug, video_url")
    .in("slug", LESSONS);

  if (verifyErr) { console.error("Verify query failed:", verifyErr.message); process.exit(1); }

  const misses = (data ?? []).filter(
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

main();
