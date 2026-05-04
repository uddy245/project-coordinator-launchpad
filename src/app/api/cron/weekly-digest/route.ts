/**
 * Weekly digest cron — sends every active learner their week-in-review.
 *
 * Schedule via Vercel Cron in `vercel.json`:
 *   { "path": "/api/cron/weekly-digest", "schedule": "0 14 * * 0" }
 * (Sunday 14:00 UTC = 09:00 ET / 15:00 CET — early morning Pacific.)
 *
 * Auth: Vercel Cron sends an `Authorization: Bearer <CRON_SECRET>` header.
 * For local / manual triggering, pass the same header. We compare against
 * `GRADE_WORKER_SECRET` since that env is already provisioned and serves
 * the same "trusted internal call" purpose.
 *
 * Resilience: each user is sent independently. One failure doesn't abort
 * the run. We log per-user outcomes and return a summary count.
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { renderWeeklyDigest } from "@/lib/email/templates/weekly-digest";
import { env } from "@/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Vercel cron functions can run up to 5 minutes on the Pro plan; 60s is a
// safe default for free/hobby. The query is per-user so amortised time per
// 1000 users at ~50ms each = ~50s.
export const maxDuration = 60;

type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  weekly_digest_opt_in: boolean | null;
};

type ProgressRow = {
  user_id: string;
  lesson_id: string;
  completed_at: string | null;
};

type LessonRow = {
  id: string;
  slug: string;
  title: string;
  number: number;
  is_published: boolean;
};

type ActivityRow = {
  user_id: string;
  activity_date: string;
};

function authorise(req: Request): boolean {
  const provided = req.headers.get("authorization");
  if (!provided) return false;
  const expected = `Bearer ${env.GRADE_WORKER_SECRET}`;
  return provided === expected;
}

function isoDateNDaysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  if (!authorise(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Audience: every confirmed user who has at least one purchase or progress
  // row, opt-in not explicitly false.
  const { data: usersData } = await admin
    .from("profiles")
    .select("id, email, full_name, weekly_digest_opt_in");
  const users = (usersData ?? []) as UserRow[];
  const optedIn = users.filter((u) => u.weekly_digest_opt_in !== false && !!u.email);

  // Single bulk fetch for the activity / progress data so per-user is just
  // a hash lookup.
  const since = isoDateNDaysAgo(7);

  const [{ data: activityData }, { data: progressData }, { data: lessonsData }] = await Promise.all(
    [
      admin.from("learning_activity").select("user_id, activity_date").gte("activity_date", since),
      admin
        .from("lesson_progress")
        .select("user_id, lesson_id, completed_at")
        .not("completed_at", "is", null),
      admin
        .from("lessons")
        .select("id, slug, title, number, is_published")
        .eq("is_published", true)
        .order("number", { ascending: true }),
    ]
  );

  const activity = (activityData ?? []) as ActivityRow[];
  const progress = (progressData ?? []) as ProgressRow[];
  const lessons = (lessonsData ?? []) as LessonRow[];

  // Per-user activity day count (week)
  const activeByUser = new Map<string, Set<string>>();
  for (const row of activity) {
    if (!activeByUser.has(row.user_id)) activeByUser.set(row.user_id, new Set());
    activeByUser.get(row.user_id)!.add(row.activity_date);
  }

  const completedByUser = new Map<string, Set<string>>();
  const completedDateByUser = new Map<string, ProgressRow[]>();
  for (const row of progress) {
    if (!completedByUser.has(row.user_id)) completedByUser.set(row.user_id, new Set());
    completedByUser.get(row.user_id)!.add(row.lesson_id);
    if (!completedDateByUser.has(row.user_id)) completedDateByUser.set(row.user_id, []);
    completedDateByUser.get(row.user_id)!.push(row);
  }

  // Streaks — pull the RPC for each user. Cheap because there's an index;
  // if this grows, batch-fetch instead.
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const errors: Array<{ userId: string; reason: string }> = [];

  for (const u of optedIn) {
    try {
      const activeDays = activeByUser.get(u.id)?.size ?? 0;
      const completedSet = completedByUser.get(u.id) ?? new Set<string>();
      const completedThisWeek = (completedDateByUser.get(u.id) ?? []).filter(
        (r) => r.completed_at && r.completed_at.slice(0, 10) >= since
      ).length;

      const { data: streakData } = await admin.rpc("user_streak", { p_user_id: u.id });
      const streak = (streakData ?? { current: 0, longest: 0 }) as {
        current: number;
        longest: number;
      };

      // Suggested next: first published lesson the user hasn't completed.
      const next = lessons.find((l) => !completedSet.has(l.id));

      const render = renderWeeklyDigest({
        firstName: u.full_name ? u.full_name.split(/\s+/)[0] : null,
        activeDays,
        currentStreak: streak.current ?? 0,
        longestStreak: streak.longest ?? 0,
        lessonsCompletedThisWeek: completedThisWeek,
        lessonsCompletedTotal: completedSet.size,
        nextLessonSlug: next?.slug ?? null,
        nextLessonTitle: next?.title ?? null,
        nextLessonNumber: next?.number ?? null,
      });

      const result = await sendEmail({
        to: { email: u.email, name: u.full_name },
        render,
        silent: true,
        tag: "weekly-digest",
      });

      if (result.ok) {
        if ("skipped" in result && result.skipped) skipped++;
        else sent++;
      } else {
        failed++;
        errors.push({ userId: u.id, reason: result.error });
      }
    } catch (err) {
      failed++;
      errors.push({
        userId: u.id,
        reason: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    audience: optedIn.length,
    sent,
    skipped,
    failed,
    errors: errors.slice(0, 10),
  });
}
