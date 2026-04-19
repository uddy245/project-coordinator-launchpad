import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { PurchaseCTA } from "@/components/marketing/purchase-cta";
import { LessonCard } from "@/components/dashboard/lesson-card";
import { GateStatusBadge } from "@/components/dashboard/gate-status-badge";
import { computeLessonStatus } from "@/lib/lessons/progress";

export const metadata = { title: "Dashboard — Launchpad" };

function firstName(fullName: string | null, email: string): string {
  if (fullName) return fullName.split(" ")[0] ?? fullName;
  return email.split("@")[0] ?? email;
}

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("has_access, full_name")
    .eq("id", user.id)
    .single();

  const hasAccess = profile?.has_access ?? false;
  const greeting = firstName(profile?.full_name ?? null, user.email ?? "");

  if (!hasAccess) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Welcome, {greeting}.</h1>
          <p className="text-muted-foreground">One purchase unlocks the whole program.</p>
        </div>
        <PurchaseCTA />
      </div>
    );
  }

  // has_access=true: load the first published lesson. RLS enforces that only
  // published lessons visible to this user come back.
  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, slug, number, title, summary, estimated_minutes")
    .eq("is_published", true)
    .order("number", { ascending: true })
    .limit(1)
    .maybeSingle();

  // Progress row for this lesson (may not exist yet — that's "not_started").
  const { data: progress } = lesson
    ? await supabase
        .from("lesson_progress")
        .select("video_watched, quiz_passed, artifact_submitted")
        .eq("user_id", user.id)
        .eq("lesson_id", lesson.id)
        .maybeSingle()
    : { data: null };

  const lessonStatus = computeLessonStatus(progress);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome back, {greeting}.</h1>
        <p className="text-muted-foreground">Pick up where you left off.</p>
      </div>

      {lesson ? (
        <LessonCard
          number={lesson.number}
          title={lesson.title}
          summary={lesson.summary}
          slug={lesson.slug}
          estimatedMinutes={lesson.estimated_minutes}
          status={lessonStatus}
        />
      ) : (
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          No lessons published yet — check back soon.
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Your gates
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <GateStatusBadge
            name="Gate 1 — Foundations"
            status="coming_soon"
            detail="Unlocked once the full M1–M4 track ships."
          />
          <GateStatusBadge
            name="Gate 2 — Portfolio"
            status="pending"
            detail="0 of 7 graded artifacts submitted."
          />
          <GateStatusBadge name="Gate 3 — Mock interviews" status="coming_soon" />
          <GateStatusBadge name="Gate 4 — Industry capstone" status="coming_soon" />
        </div>
      </section>
    </div>
  );
}
