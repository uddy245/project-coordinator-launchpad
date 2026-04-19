import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ArtifactCard } from "@/components/portfolio/artifact-card";

export const metadata = { title: "Portfolio — Launchpad" };

export default async function PortfolioPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: graded } = await supabase
    .from("submissions")
    .select("id, original_filename, submitted_at, overall_score, pass, hire_ready, lesson_id")
    .eq("user_id", user.id)
    .eq("status", "graded")
    .order("submitted_at", { ascending: false });

  const lessonIds = Array.from(new Set((graded ?? []).map((s) => s.lesson_id)));
  const { data: lessons } = lessonIds.length
    ? await supabase.from("lessons").select("id, title").in("id", lessonIds)
    : { data: [] };

  const lessonTitle = new Map((lessons ?? []).map((l) => [l.id, l.title]));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Portfolio</h1>
        <p className="text-sm text-muted-foreground">
          Your graded artifacts. Build these up over the program — seven hire-ready entries clears
          Gate 2.
        </p>
      </header>

      {graded && graded.length > 0 ? (
        <div className="space-y-3">
          {graded.map((s) => (
            <ArtifactCard
              key={s.id}
              submissionId={s.id}
              lessonTitle={lessonTitle.get(s.lesson_id) ?? "Lesson"}
              filename={s.original_filename}
              submittedAt={s.submitted_at}
              overallScore={s.overall_score}
              pass={s.pass}
              hireReady={s.hire_ready}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-muted-foreground">You haven&apos;t submitted any artifacts yet.</p>
          <Button asChild className="mt-4">
            <Link href="/lessons/raid-logs?tab=workbook">Start with Lesson 20</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
