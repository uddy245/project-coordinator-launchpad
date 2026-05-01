/**
 * Pool-first quiz selection with AI top-up.
 *
 * Given a user and a lesson, return up to `count` items the user has not
 * yet seen. If the unseen pool is shorter than count, generate the gap
 * via Claude (which inserts new items into quiz_items, growing the
 * shared pool for everyone). Then record everything served in
 * quiz_item_seen so the next refresh doesn't repeat them.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { generateQuizItems, type GeneratedQuizItem } from "@/lib/quiz/generate";

export type ServedQuizItem = {
  id: string;
  sort: number;
  stem: string;
  options: { id: string; text: string }[];
  competency: string;
  difficulty: "easy" | "medium" | "hard";
  source: "pool" | "ai";
};

export type SelectQuizResult = {
  items: ServedQuizItem[];
  generated: number; // how many came from Claude this call
  poolExhausted: boolean; // true if even after generation we still couldn't fill
};

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function selectQuizItemsForUser({
  supabase,
  userId,
  lessonId,
  lessonSlug,
  lessonTitle,
  lessonSummary,
  competency,
  count = 10,
}: {
  supabase: SupabaseClient;
  userId: string;
  lessonId: string;
  lessonSlug: string;
  lessonTitle: string;
  lessonSummary: string | null;
  competency: string;
  count?: number;
}): Promise<SelectQuizResult> {
  // 1. Fetch all items for the lesson + this user's seen ids in parallel.
  const [{ data: allItems }, { data: seenRows }] = await Promise.all([
    supabase
      .from("quiz_items")
      .select("id, sort, stem, options, competency, difficulty")
      .eq("lesson_id", lessonId),
    supabase
      .from("quiz_item_seen")
      .select("quiz_item_id")
      .eq("user_id", userId)
      .eq("lesson_id", lessonId),
  ]);

  const seenIds = new Set((seenRows ?? []).map((r) => r.quiz_item_id));
  const unseen = (allItems ?? []).filter((it) => !seenIds.has(it.id));

  // 2. If we already have enough unseen items, shuffle and take count.
  let served: ServedQuizItem[] = [];
  let generated = 0;
  let poolExhausted = false;

  if (unseen.length >= count) {
    served = shuffle(unseen)
      .slice(0, count)
      .map((it) => ({
        id: it.id,
        sort: it.sort,
        stem: it.stem,
        options: it.options as { id: string; text: string }[],
        competency: it.competency,
        difficulty: it.difficulty as "easy" | "medium" | "hard",
        source: "pool" as const,
      }));
  } else {
    // 3. Pool is short — take everything unseen, generate the rest.
    served = unseen.map((it) => ({
      id: it.id,
      sort: it.sort,
      stem: it.stem,
      options: it.options as { id: string; text: string }[],
      competency: it.competency,
      difficulty: it.difficulty as "easy" | "medium" | "hard",
      source: "pool" as const,
    }));

    const gap = count - served.length;
    const maxSort = Math.max(0, ...((allItems ?? []).map((r) => r.sort)));

    let aiItems: GeneratedQuizItem[] = [];
    try {
      aiItems = await generateQuizItems({
        lessonId,
        lessonSlug,
        lessonTitle,
        lessonSummary,
        competency,
        count: gap,
        startSort: maxSort + 1,
      });
      generated = aiItems.length;
    } catch (err) {
      // Generation failed (spend cap, Claude error, validation). Best
      // effort: serve whatever pool we had. Caller can detect via
      // poolExhausted + items.length < count.
      console.error("[quiz/select] AI generation failed:", err);
      poolExhausted = true;
    }

    served = [
      ...served,
      ...aiItems.map((it) => ({
        id: it.id,
        sort: it.sort,
        stem: it.stem,
        options: it.options,
        competency: it.competency,
        difficulty: it.difficulty,
        source: "ai" as const,
      })),
    ];
    if (served.length < count) poolExhausted = true;
  }

  // 4. Record everything we just served in the seen table so the next
  //    refresh picks different items. Best-effort — if the insert fails
  //    the user just sees the same items next time, which is recoverable.
  if (served.length > 0) {
    const seenRowsToInsert = served.map((it) => ({
      user_id: userId,
      quiz_item_id: it.id,
      lesson_id: lessonId,
    }));
    await supabase
      .from("quiz_item_seen")
      .upsert(seenRowsToInsert, { onConflict: "user_id,quiz_item_id" });
  }

  // 5. Sort served items by their sort value so the UI presentation is stable.
  served.sort((a, b) => a.sort - b.sort);

  return { items: served, generated, poolExhausted };
}

/**
 * Clear a user's seen history for a lesson — used by the "I've seen
 * everything, reset" flow. Caller must already have authenticated.
 */
export async function resetSeenHistory({
  supabase,
  userId,
  lessonId,
}: {
  supabase: SupabaseClient;
  userId: string;
  lessonId: string;
}): Promise<{ deleted: number }> {
  const { count } = await supabase
    .from("quiz_item_seen")
    .delete({ count: "exact" })
    .eq("user_id", userId)
    .eq("lesson_id", lessonId);
  return { deleted: count ?? 0 };
}
