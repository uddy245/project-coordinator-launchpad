import { eq } from "drizzle-orm";
import { db } from "@/db";
import { lessons } from "@/db/schema";
import { getAppUser } from "@/lib/auth/session";
import { canViewLesson } from "@/lib/lessons/access";
import { getCurrentQuizItems } from "@/lib/quiz/select";
import { QuizPlayer, type QuizItemPublic } from "./quiz-player";

export async function QuizPanel({ lessonSlug }: { lessonSlug: string }) {
  const user = await getAppUser();

  // The lesson's id + metadata is needed for the selector and any
  // fallback Claude generation. Access (was RLS): free preview lessons for
  // everyone signed in, other lessons need has_access, admins see all.
  const [row] = user
    ? await db
        .select({
          id: lessons.id,
          title: lessons.title,
          summary: lessons.summary,
          competency: lessons.competency,
          isPublished: lessons.isPublished,
          isPreview: lessons.isPreview,
        })
        .from(lessons)
        .where(eq(lessons.slug, lessonSlug))
        .limit(1)
    : [];
  const lesson = user && row && (await canViewLesson(user.id, row)) ? row : null;

  if (!user || !lesson) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        Lesson not available.
      </div>
    );
  }

  // The bootstrap path (first-time visitor) may write quiz_items +
  // quiz_item_seen; after that getCurrentQuizItems is read-only.
  // Explicit projection below: never pass `correct` or
  // `distractor_rationale` to the client.
  const result = await getCurrentQuizItems({
    userId: user.id,
    lessonId: lesson.id,
    lessonSlug,
    lessonTitle: lesson.title,
    lessonSummary: lesson.summary,
    competency: lesson.competency,
    count: 10,
  });
  const items: QuizItemPublic[] = result.items.map((it) => ({
    id: it.id,
    sort: it.sort,
    stem: it.stem,
    options: it.options,
    competency: it.competency,
    difficulty: it.difficulty,
  }));

  if (items.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        Quiz is being prepared — check back soon.
      </div>
    );
  }

  return <QuizPlayer lessonSlug={lessonSlug} items={items} canRefresh />;
}
