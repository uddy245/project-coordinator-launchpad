import { createClient } from "@/lib/supabase/server";
import { QuizPlayer, type QuizItemPublic } from "./quiz-player";

export async function QuizPanel({ lessonSlug }: { lessonSlug: string }) {
  const supabase = await createClient();

  // The lesson's id is needed to filter; RLS on lessons returns only
  // published lessons the caller can see.
  const { data: lesson } = await supabase
    .from("lessons")
    .select("id")
    .eq("slug", lessonSlug)
    .maybeSingle();

  if (!lesson) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        Lesson not available.
      </div>
    );
  }

  const { data: items } = await supabase
    .from("quiz_items_public")
    .select("id, sort, stem, options, competency, difficulty")
    .eq("lesson_id", lesson.id)
    .order("sort", { ascending: true });

  if (!items || items.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        Quiz is being prepared — check back soon.
      </div>
    );
  }

  return <QuizPlayer lessonSlug={lessonSlug} items={items as QuizItemPublic[]} />;
}
