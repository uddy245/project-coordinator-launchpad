import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { lessons } from "@/db/schema";
import { canViewLesson } from "@/lib/lessons/access";
import { LessonHeader } from "@/components/lessons/lesson-header";
import { LessonTabs, type LessonTabKey } from "@/components/lessons/tabs";
import { WorkbookPanel } from "@/components/lessons/workbook-panel";
import { QuizPanel } from "@/components/lessons/quiz-panel";
import { VideoPanel } from "@/components/lessons/video-panel";
import { ReadPanel } from "@/components/lessons/read-panel";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: `Lesson — ${slug}` };
}

function resolveTab(raw: string | string[] | undefined): LessonTabKey {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === "workbook" || value === "quiz" || value === "video" || value === "read") {
    return value;
  }
  return "video";
}

export default async function LessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const user = await requireUser();
  const [{ slug }, { tab }] = await Promise.all([params, searchParams]);

  // lessons (was RLS): free preview lessons for everyone signed in, other
  // published lessons need has_access, admins see all (incl. drafts).
  const [row] = await db
    .select({
      number: lessons.number,
      title: lessons.title,
      summary: lessons.summary,
      estimated_minutes: lessons.estimatedMinutes,
      isPublished: lessons.isPublished,
      isPreview: lessons.isPreview,
    })
    .from(lessons)
    .where(eq(lessons.slug, slug))
    .limit(1);
  const lesson = row && (await canViewLesson(user.id, row)) ? row : undefined;
  const lessonTitle = lesson?.title ?? "";

  if (!lesson) {
    // Either the slug doesn't exist or the user may not view it.
    // 404 in both cases — we don't leak which.
    notFound();
  }

  const active = resolveTab(tab);

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <LessonHeader
          number={lesson.number}
          title={lesson.title}
          estimatedMinutes={lesson.estimated_minutes}
        />

        <LessonTabs active={active} />
      </div>

      <section
        aria-label={`${active} content`}
        className={active === "read" ? "mx-auto max-w-4xl" : "mx-auto max-w-3xl"}
      >
        {active === "video" && <VideoPanel lessonSlug={slug} />}
        {active === "read" && (
          <ReadPanel lessonSlug={slug} lessonNumber={lesson.number} lessonTitle={lessonTitle} />
        )}
        {active === "workbook" && <WorkbookPanel lessonSlug={slug} lessonTitle={lessonTitle} />}
        {active === "quiz" && <QuizPanel lessonSlug={slug} />}
      </section>
    </div>
  );
}
