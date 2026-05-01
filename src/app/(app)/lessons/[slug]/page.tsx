import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { LessonHeader } from "@/components/lessons/lesson-header";
import { LessonTabs, type LessonTabKey } from "@/components/lessons/tabs";
import { WorkbookPanel } from "@/components/lessons/workbook-panel";
import { QuizPanel } from "@/components/lessons/quiz-panel";
import { VideoPanel } from "@/components/lessons/video-panel";
import { ReadPanel } from "@/components/lessons/read-panel";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: `Lesson — ${slug}` };
}

function resolveTab(raw: string | string[] | undefined): LessonTabKey {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === "workbook" || value === "quiz" || value === "video" || value === "read") {
    return value;
  }
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
  const lessonTitle = lesson?.title ?? "";

  if (!lesson) {
    // Either the slug doesn't exist or RLS hid it (has_access=false).
    // 404 in both cases — we don't leak which.
    notFound();
  }

  const active = resolveTab(tab);

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <LessonHeader
          number={lesson.number}
          title={lesson.title}
          estimatedMinutes={lesson.estimated_minutes}
        />

        <LessonTabs active={active} />
      </div>

      <section
        aria-label={`${active} content`}
        className={active === "read" ? "mx-auto max-w-4xl" : "mx-auto max-w-3xl"}
      >
        {active === "video" && <VideoPanel lessonSlug={slug} />}
        {active === "read" && (
          <ReadPanel
            lessonSlug={slug}
            lessonNumber={lesson.number}
            lessonTitle={lessonTitle}
          />
        )}
        {active === "workbook" && <WorkbookPanel lessonSlug={slug} lessonTitle={lessonTitle} />}
        {active === "quiz" && <QuizPanel lessonSlug={slug} />}
      </section>
    </div>
  );
}
