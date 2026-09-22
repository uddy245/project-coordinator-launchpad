import { requireUser } from "@/lib/auth/require-user";
import { and, asc, count, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  gateStatus,
  lessonProgress,
  lessons,
  mockInterviewResponses,
  mockInterviewScenarios,
  profiles,
} from "@/db/schema";
import { isAdmin } from "@/lib/auth/session";
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

  // profiles: own row only.
  const [profile] = await db
    .select({ has_access: profiles.hasAccess, full_name: profiles.fullName })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

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

  // has_access=true from here on. RLS used to let learners see only
  // published lessons (admins: all); enforce that explicitly.
  const admin = await isAdmin(user.id);

  const lessonRows = await db
    .select({
      id: lessons.id,
      slug: lessons.slug,
      number: lessons.number,
      title: lessons.title,
      summary: lessons.summary,
      estimated_minutes: lessons.estimatedMinutes,
    })
    .from(lessons)
    .where(eq(lessons.isPublished, true))
    .orderBy(asc(lessons.number));

  // Pull all progress rows for this user in one query, then map by lesson_id.
  const progressRows = await db
    .select({
      lesson_id: lessonProgress.lessonId,
      video_watched: lessonProgress.videoWatched,
      quiz_passed: lessonProgress.quizPassed,
      artifact_submitted: lessonProgress.artifactSubmitted,
    })
    .from(lessonProgress)
    .where(eq(lessonProgress.userId, user.id));

  const progressByLessonId = new Map(progressRows.map((row) => [row.lesson_id, row]));

  const [gateRow] = await db
    .select({
      foundation_complete: gateStatus.foundationComplete,
      portfolio_complete: gateStatus.portfolioComplete,
      portfolio_artifacts_count: gateStatus.portfolioArtifactsCount,
      portfolio_artifacts_target: gateStatus.portfolioArtifactsTarget,
      interview_complete: gateStatus.interviewComplete,
      industry_complete: gateStatus.industryComplete,
    })
    .from(gateStatus)
    .where(eq(gateStatus.userId, user.id))
    .limit(1);

  // Build a slug-keyed map of foundation lesson progress for Gate 1.
  // We fetch the four foundation lessons by slug + the user's progress
  // rows (if any) and pass both to computeGateSummary.
  const foundationLessons = await db
    .select({ id: lessons.id, slug: lessons.slug })
    .from(lessons)
    .where(
      and(
        inArray(lessons.slug, [...FOUNDATION_SLUGS]),
        admin ? undefined : eq(lessons.isPublished, true)
      )
    );
  const foundationProgressBySlug = new Map<
    string,
    { video_watched: boolean; quiz_passed: boolean; artifact_submitted: boolean } | null
  >();
  for (const slug of FOUNDATION_SLUGS) {
    foundationProgressBySlug.set(slug, null);
  }
  for (const lesson of foundationLessons) {
    const row = progressByLessonId.get(lesson.id);
    foundationProgressBySlug.set(lesson.slug, row ?? null);
  }
  // Mock interview progress for Gate 3.
  const [scenarioCountRow] = await db
    .select({ n: count() })
    .from(mockInterviewScenarios)
    .where(eq(mockInterviewScenarios.isPublished, true));
  const totalScenarios = Number(scenarioCountRow?.n ?? 0);
  const passedScenarios = await db
    .select({ scenario_id: mockInterviewResponses.scenarioId })
    .from(mockInterviewResponses)
    .where(and(eq(mockInterviewResponses.userId, user.id), eq(mockInterviewResponses.pass, true)));
  const passedCount2 = passedScenarios.length;

  const gates = computeGateSummary(
    gateRow ?? null,
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
  const completionPct = Math.round((completedCount / TOTAL_PROGRAMME) * 100);

  // Daily streak (SQL function public.user_streak, returns integer).
  let streak = 0;
  try {
    const streakRes = (await db.execute(sql`select public.user_streak(${user.id}) as streak`)) as {
      rows: Array<{ streak: number | string | null }>;
    };
    streak = Number(streakRes.rows[0]?.streak ?? 0) || 0;
  } catch {
    streak = 0;
  }

  // Heuristic recommender: foundations first → partial progress → next un-touched.
  // See src/lib/lessons/recommender.ts for the rules.
  const recommendation = await recommendNextLesson(user.id);
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
      {lessonRows.length > 0 ? (
        <section>
          <div className="mb-3 flex items-baseline justify-between border-b border-rule pb-3">
            <h2 className="kicker">Modules</h2>
            <span className="kicker">Click to enter →</span>
          </div>
          <div className="space-y-3">
            {lessonRows.map((lesson) => (
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
