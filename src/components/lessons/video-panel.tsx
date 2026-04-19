import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { VideoPlayer } from "./video-player";

export async function VideoPanel({ lessonSlug }: { lessonSlug: string }) {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, video_url")
    .eq("slug", lessonSlug)
    .maybeSingle();

  if (!lesson) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        Lesson not available.
      </div>
    );
  }

  const { data: progress } = await supabase
    .from("lesson_progress")
    .select("video_seconds_watched")
    .eq("user_id", user.id)
    .eq("lesson_id", lesson.id)
    .maybeSingle();

  return (
    <VideoPlayer
      lessonSlug={lessonSlug}
      videoUrl={lesson.video_url}
      initialSeconds={progress?.video_seconds_watched ?? 0}
    />
  );
}
