import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentQuizItems } from "@/lib/quiz/select";
import { QuizPlayer, type QuizItemPublic } from "./quiz-player";

export async function QuizPanel({ lessonSlug }: { lessonSlug: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The lesson's id + metadata is needed for the selector and any
  // fallback Claude generation. RLS on lessons returns only published
  // lessons the caller can see.
  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, title, summary, competency")
    .eq("slug", lessonSlug)
    .maybeSingle();

  if (!lesson) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        Lesson not available.
      </div>
    );
  }

  // For unauthenticated viewers (e.g. the public preview route), fall back
  // to the legacy "show first 10 by sort" view from quiz_items_public so we
  // don't need a user-id to render. Authenticated learners get the
  // pool-with-history selector.
  let items: QuizItemPublic[] = [];

  if (!user) {
    const { data: previewItems } = await supabase
      .from("quiz_items_public")
      .select("id, sort, stem, options, competency, difficulty")
      .eq("lesson_id", lesson.id)
      .order("sort", { ascending: true })
      .limit(10);
    items = (previewItems ?? []) as QuizItemPublic[];
  } else {
    // Use the admin client so the bootstrap path (first-time visitor)
    // can write to quiz_items + quiz_item_seen. After bootstrap,
    // getCurrentQuizItems is read-only so subsequent renders are cheap
    // and never trigger Claude generation.
    const admin = createAdminClient();
    const result = await getCurrentQuizItems({
      supabase: admin,
      userId: user.id,
      lessonId: lesson.id,
      lessonSlug,
      lessonTitle: lesson.title,
      lessonSummary: lesson.summary,
      competency: lesson.competency,
      count: 10,
    });
    items = result.items.map((it) => ({
      id: it.id,
      sort: it.sort,
      stem: it.stem,
      options: it.options,
      competency: it.competency,
      difficulty: it.difficulty,
    }));
  }

  if (!items || items.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        Quiz is being prepared — check back soon.
      </div>
    );
  }

  return (
    <QuizPlayer
      lessonSlug={lessonSlug}
      items={items}
      canRefresh={!!user}
    />
  );
}
