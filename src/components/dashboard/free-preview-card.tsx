import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { FreePreviewLesson } from "@/lib/lessons/preview";

/**
 * Shown under the purchase box to a learner who has not paid: a way to try
 * the free preview lesson before buying. Renders nothing when no lesson is
 * marked as a free preview.
 */
export function FreePreviewCard({ lesson }: { lesson: FreePreviewLesson | null }) {
  if (!lesson) return null;

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Try a lesson first, free</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Lesson {lesson.number}, <strong>{lesson.title}</strong>, is open to you now: the video, the
        reading, the quiz and a graded assignment.
      </p>
      <Button asChild variant="outline" size="lg" className="mt-4">
        <Link href={`/lessons/${lesson.slug}`}>Start the free lesson</Link>
      </Button>
    </div>
  );
}
