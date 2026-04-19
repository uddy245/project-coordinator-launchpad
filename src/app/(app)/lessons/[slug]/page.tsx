import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { LessonHeader } from "@/components/lessons/lesson-header";
import { LessonTabs, type LessonTabKey } from "@/components/lessons/tabs";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: `Lesson — ${slug}` };
}

function resolveTab(raw: string | string[] | undefined): LessonTabKey {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === "workbook" || value === "quiz" || value === "video") return value;
  return "video";
}

export default async function LessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  await requireUser();
  const [{ slug }, { tab }] = await Promise.all([params, searchParams]);

  const supabase = await createClient();
  const { data: lesson } = await supabase
    .from("lessons")
    .select("number, title, summary, estimated_minutes")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!lesson) {
    // Either the slug doesn't exist or RLS hid it (has_access=false).
    // 404 in both cases — we don't leak which.
    notFound();
  }

  const active = resolveTab(tab);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <LessonHeader
        number={lesson.number}
        title={lesson.title}
        estimatedMinutes={lesson.estimated_minutes}
      />

      <LessonTabs active={active} />

      <section
        className="rounded-lg border bg-card p-6 text-sm text-muted-foreground"
        aria-label={`${active} content`}
      >
        {active === "video" && <p>Video player lands in LES-004. {lesson.summary}</p>}
        {active === "workbook" && <p>Workbook templates land in LES-005.</p>}
        {active === "quiz" && <p>Quiz player lands in LES-007.</p>}
      </section>
    </div>
  );
}
