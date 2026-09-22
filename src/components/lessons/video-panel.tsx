import { requireUser } from "@/lib/auth/require-user";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { lessonProgress, lessons } from "@/db/schema";
import { canViewLesson } from "@/lib/lessons/access";
import { VideoPlayer } from "./video-player";

export async function VideoPanel({ lessonSlug }: { lessonSlug: string }) {
  const user = await requireUser();

  // lessons (was RLS): free preview lessons for everyone signed in, other
  // published lessons need has_access, admins see all.
  const [row] = await db
    .select({
      id: lessons.id,
      video_url: lessons.videoUrl,
      isPublished: lessons.isPublished,
      isPreview: lessons.isPreview,
    })
    .from(lessons)
    .where(eq(lessons.slug, lessonSlug))
    .limit(1);
  const lesson = row && (await canViewLesson(user.id, row)) ? row : null;

  if (!lesson) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        Lesson not available.
      </div>
    );
  }

  // lesson_progress: owner only.
  const [progress] = await db
    .select({ video_seconds_watched: lessonProgress.videoSecondsWatched })
    .from(lessonProgress)
    .where(and(eq(lessonProgress.userId, user.id), eq(lessonProgress.lessonId, lesson.id)))
    .limit(1);

  return (
    <VideoPlayer
      lessonSlug={lessonSlug}
      videoUrl={lesson.video_url}
      initialSeconds={progress?.video_seconds_watched ?? 0}
    />
  );
}
