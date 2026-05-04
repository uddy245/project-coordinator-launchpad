import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { PurchaseCTA } from "@/components/marketing/purchase-cta";
import { LessonCard } from "@/components/dashboard/lesson-card";
import { GateStatusBadge } from "@/components/dashboard/gate-status-badge";
import { StreakBadge } from "@/components/dashboard/streak-badge";
import { computeLessonStatus } from "@/lib/lessons/progress";
import { computeGateSummary, FOUNDATION_SLUGS } from "@/lib/gates/compute";
import { recommendNextLesson } from "@/lib/lessons/recommender";

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

  // has_access=true: load all published lessons. RLS enforces that only
  // lessons visible to this user come back.
  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, slug, number, title, summary, estimated_minutes")
    .eq("is_published", true)
    .order("number", { ascending: true });

  // Pull all progress rows for this user in one query, then map by lesson_id.
  const { data: progressRows } = await supabase
    .from("lesson_progress")
    .select("lesson_id, video_watched, quiz_passed, artifact_submitted")
    .eq("user_id", user.id);

  const progressByLessonId = new Map((progressRows ?? []).map((row) => [row.lesson_id, row]));

  const { data: gateRow } = await supabase
    .from("gate_status")
    .select(
      "foundation_complete, portfolio_complete, portfolio_artifacts_count, portfolio_artifacts_target, interview_complete, industry_complete"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  // Build a slug-keyed map of foundation lesson progress for Gate 1.
  // We fetch the four foundation lessons by slug + the user's progress
  // rows (if any) and pass both to computeGateSummary.
  const { data: foundationLessons } = await supabase
    .from("lessons")
    .select("id, slug")
    .in("slug", [...FOUNDATION_SLUGS]);
  const foundationProgressBySlug = new Map<
    string,
    { video_watched: boolean; quiz_passed: boolean; artifact_submitted: boolean } | null
  >();
  for (const slug of FOUNDATION_SLUGS) {
    foundationProgressBySlug.set(slug, null);
  }
  for (const lesson of foundationLessons ?? []) {
    const row = progressByLessonId.get(lesson.id);
    foundationProgressBySlug.set(lesson.slug, row ?? null);
  }
  // Mock interview progress for Gate 3.
  const { data: scenarioCountRow } = await supabase
    .from("mock_interview_scenarios")
    .select("id", { count: "exact", head: true })
    .eq("is_published", true);
  const totalScenarios = (scenarioCountRow as unknown as { count?: number } | null)?.count ?? 0;
  const { data: passedScenarios } = await supabase
    .from("mock_interview_responses")
    .select("scenario_id")
    .eq("user_id", user.id)
    .eq("pass", true);
  const passedCount2 = passedScenarios?.length ?? 0;

  const gates = computeGateSummary(
    gateRow,
    { byLessonSlug: foundationProgressBySlug },
    { passed: passedCount2, total: totalScenarios }
  );

  // Stats for the programme banner
  const TOTAL_PROGRAMME = 25;
  const completedCount = Array.from(progressByLessonId.values()).filter(
    (p) => p.video_watched && p.quiz_passed && p.artifact_submitted
  ).length;
  const inProgressCount = Array.from(progressByLessonId.values()).filter(
    (p) =>
      (p.video_watched || p.quiz_passed || p.artifact_submitted) &&
      !(p.video_watched && p.quiz_passed && p.artifact_submitted)
  ).length;
  const publishedCount = lessons?.length ?? 0;
  const completionPct = Math.round((completedCount / TOTAL_PROGRAMME) * 100);

  // Daily streak (server-side RPC).
  const { data: streakRow } = await supabase.rpc("user_streak", { p_user_id: user.id });
  const streak: number =
    typeof streakRow === "number"
      ? streakRow
      : Array.isArray(streakRow) && streakRow.length > 0
        ? Number(streakRow[0]) || 0
        : 0;

  // Heuristic recommender: foundations first → partial progress → next un-touched.
  // See src/lib/lessons/recommender.ts for the rules.
  const recommendation = await recommendNextLesson(supabase, user.id);
  const nextLesson = recommendation
    ? {
        id: recommendation.lessonId,
        slug: recommendation.slug,
        number: recommendation.number,
        title: recommendation.title,
      }
    : null;

  return (
    <div className="space-y-12">
      {/* Programme header */}
      <section className="border-b border-rule pb-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <span className="kicker">PROG·PC·25 · Project Coordinator Launchpad</span>
          <span className="kicker">Cohort · Self-paced</span>
        </div>
        <h1 className="display-title mt-3 text-[2rem] sm:text-[2.6rem]">
          Welcome back, {greeting}.
        </h1>
        {nextLesson ? (
          <p className="mt-2 text-base text-muted-foreground">
            Up next:{" "}
            <a
              href={`/lessons/${nextLesson.slug}`}
              className="font-medium text-ink underline decoration-[hsl(var(--accent))] decoration-2 underline-offset-[5px]"
            >
              Module {String(nextLesson.number).padStart(2, "0")} — {nextLesson.title}
            </a>
            {recommendation?.reason ? (
              <span className="ml-2 text-sm text-muted-foreground">· {recommendation.reason}</span>
            ) : null}
          </p>
        ) : null}
      </section>

      {/* Stats banner — university transcript meets office dashboard */}
      <section className="grid grid-cols-2 gap-px bg-rule lg:grid-cols-4">
        <StatTile
          label="Programme progress"
          value={`${completionPct}%`}
          hint={`${completedCount} of ${TOTAL_PROGRAMME} modules`}
        />
        <StatTile
          label="In progress"
          value={String(inProgressCount).padStart(2, "0")}
          hint="active modules"
        />
        <StreakBadge streak={streak} />
        <StatTile
          label="Status"
          value={completionPct === 100 ? "Hire-ready" : "Enrolled"}
          hint="career track"
        />
      </section>

      {/* Programme progress bar */}
      <section>
        <div className="flex items-baseline justify-between pb-2">
          <span className="kicker">Curriculum tracker</span>
          <span className="kicker">
            {completedCount}/{TOTAL_PROGRAMME}
          </span>
        </div>
        <div className="track">
          <div
            className="track-fill"
            style={{ transform: `scaleX(${Math.max(0.02, completedCount / TOTAL_PROGRAMME)})` }}
          />
        </div>
      </section>

      {/* Module list */}
      {lessons && lessons.length > 0 ? (
        <section>
          <div className="mb-3 flex items-baseline justify-between border-b border-rule pb-3">
            <h2 className="kicker">Modules</h2>
            <span className="kicker">Click to enter →</span>
          </div>
          <div className="space-y-3">
            {lessons.map((lesson) => (
              <LessonCard
                key={lesson.id}
                number={lesson.number}
                title={lesson.title}
                summary={lesson.summary}
                slug={lesson.slug}
                estimatedMinutes={lesson.estimated_minutes}
                status={computeLessonStatus(progressByLessonId.get(lesson.id) ?? null)}
                isNext={lesson.id === nextLesson?.id}
              />
            ))}
          </div>
        </section>
      ) : (
        <div className="border border-rule px-6 py-10 text-center">
          <span className="kicker">No modules published yet — check back soon.</span>
        </div>
      )}

      {/* Career milestones */}
      <section>
        <div className="mb-3 flex items-baseline justify-between border-b border-rule pb-3">
          <h2 className="kicker">Career milestones</h2>
          <span className="kicker">Four gates · Hire-ready by Gate 4</span>
        </div>
        <div className="grid gap-px bg-rule sm:grid-cols-2">
          <GateStatusBadge
            name="Gate 1 · Foundations"
            status={gates.foundation.status}
            detail={gates.foundation.detail}
          />
          <GateStatusBadge
            name="Gate 2 · Portfolio"
            status={gates.portfolio.status}
            detail={gates.portfolio.detail}
          />
          <GateStatusBadge
            name="Gate 3 · Mock interviews"
            status={gates.interview.status}
            detail={gates.interview.detail}
          />
          <GateStatusBadge name="Gate 4 · Industry capstone" status={gates.industry} />
        </div>
      </section>
    </div>
  );
}

function StatTile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="bg-card p-6">
      <div className="kicker">{label}</div>
      <div className="data-numeral mt-2 text-[2.6rem] leading-none text-ink">{value}</div>
      <div className="mt-2 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}
