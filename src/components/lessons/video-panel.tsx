import { requireUser } from "@/lib/auth/require-user";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { lessonProgress, lessons } from "@/db/schema";
import { hasAccess, isAdmin } from "@/lib/auth/session";
import { VideoPlayer } from "./video-player";

export async function VideoPanel({ lessonSlug }: { lessonSlug: string }) {
  const user = await requireUser();

  // lessons (was RLS): learners need has_access and only see published
  // rows; admins see all.
  const [admin, access] = await Promise.all([isAdmin(user.id), hasAccess(user.id)]);
  const [lesson] = access
    ? await db
        .select({ id: lessons.id, video_url: lessons.videoUrl })
        .from(lessons)
        .where(and(eq(lessons.slug, lessonSlug), admin ? undefined : eq(lessons.isPublished, true)))
        .limit(1)
    : [];

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
