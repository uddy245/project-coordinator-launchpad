import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { and, asc, desc, eq, inArray, notInArray } from "drizzle-orm";
import { db } from "@/db";
import { lessons, submissions } from "@/db/schema";
import { hasAccess, isAdmin } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { ArtifactCard } from "@/components/portfolio/artifact-card";

export const metadata = { title: "Portfolio — Launchpad" };

export default async function PortfolioPage() {
  const user = await requireUser();

  // submissions: owner only.
  const graded = await db
    .select({
      id: submissions.id,
      original_filename: submissions.originalFilename,
      submitted_at: submissions.submittedAt,
      overall_score: submissions.overallScore,
      pass: submissions.pass,
      hire_ready: submissions.hireReady,
      lesson_id: submissions.lessonId,
    })
    .from(submissions)
    .where(and(eq(submissions.userId, user.id), eq(submissions.status, "graded")))
    .orderBy(desc(submissions.submittedAt));

  // lessons (was RLS): learners need has_access and only see published
  // rows; admins see all.
  const [admin, access] = await Promise.all([isAdmin(user.id), hasAccess(user.id)]);

  const lessonIds = Array.from(new Set(graded.map((s) => s.lesson_id)));
  const lessonRows =
    access && lessonIds.length
      ? await db
          .select({ id: lessons.id, title: lessons.title })
          .from(lessons)
          .where(
            and(inArray(lessons.id, lessonIds), admin ? undefined : eq(lessons.isPublished, true))
          )
      : [];

  const lessonTitle = new Map(lessonRows.map((l) => [l.id, l.title]));

  // CTA for the empty state — first published lesson the learner
  // hasn't graded yet, ordered by number. Falls back to the lowest
  // published lesson if everything's graded (or nothing is).
  const [nextLesson] = access
    ? await db
        .select({ slug: lessons.slug, number: lessons.number, title: lessons.title })
        .from(lessons)
        .where(
          and(
            eq(lessons.isPublished, true),
            lessonIds.length ? notInArray(lessons.id, lessonIds) : undefined
          )
        )
        .orderBy(asc(lessons.number))
        .limit(1)
    : [];
  const fallbackCta = nextLesson
    ? {
        href: `/lessons/${nextLesson.slug}?tab=workbook`,
        label: `Start with Lesson ${nextLesson.number}`,
      }
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Portfolio</h1>
        <p className="text-sm text-muted-foreground">
          Your graded artifacts. Build these up over the program — seven hire-ready entries clears
          Gate 2.
        </p>
      </header>

      {graded.length > 0 ? (
        <div className="space-y-3">
          {graded.map((s) => (
            <ArtifactCard
              key={s.id}
              submissionId={s.id}
              lessonTitle={lessonTitle.get(s.lesson_id) ?? "Lesson"}
              filename={s.original_filename}
              submittedAt={s.submitted_at}
              overallScore={s.overall_score}
              pass={s.pass}
              hireReady={s.hire_ready}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-muted-foreground">You haven&apos;t submitted any artifacts yet.</p>
          {fallbackCta && (
            <Button asChild className="mt-4">
              <Link href={fallbackCta.href}>{fallbackCta.label}</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
