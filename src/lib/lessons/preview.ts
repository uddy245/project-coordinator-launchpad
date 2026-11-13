import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { lessons } from "@/db/schema";

export type FreePreviewLesson = { slug: string; number: number; title: string };

/**
 * The first free preview lesson (published + is_preview), or null if there
 * is none. Any signed-in learner may open it, paid or not — the same rule as
 * canViewLesson(). A failed read returns null: the link is an extra, and the
 * dashboard must still render.
 */
export async function getFreePreviewLesson(): Promise<FreePreviewLesson | null> {
  try {
    const [row] = await db
      .select({ slug: lessons.slug, number: lessons.number, title: lessons.title })
      .from(lessons)
      .where(and(eq(lessons.isPublished, true), eq(lessons.isPreview, true)))
      .orderBy(asc(lessons.number))
      .limit(1);
    return row ?? null;
  } catch (err) {
    console.error("[getFreePreviewLesson] read failed", err);
    return null;
  }
}
