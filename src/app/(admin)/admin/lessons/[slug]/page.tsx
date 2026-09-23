import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { lessons, lessonTemplates } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/require-user";
import { LessonForm, type LessonFormDefaults } from "@/components/admin/lesson-form";
import { TemplateUploader, type ExistingTemplate } from "@/components/admin/template-uploader";

export const metadata = { title: "Edit lesson — Admin" };
export const dynamic = "force-dynamic";

export default async function EditLessonPage({ params }: { params: Promise<{ slug: string }> }) {
  // Layout already gates; repeated here as defence in depth (no RLS).
  await requireAdmin();
  const { slug } = await params;
  // The /admin/lessons/new route lives next to this; bail early so we don't
  // mistake the literal "new" path for a slug.
  if (slug === "new") notFound();

  const [data] = await db
    .select({
      id: lessons.id,
      slug: lessons.slug,
      number: lessons.number,
      title: lessons.title,
      summary: lessons.summary,
      video_url: lessons.videoUrl,
      competency: lessons.competency,
      prompt_name: lessons.promptName,
      estimated_minutes: lessons.estimatedMinutes,
      is_published: lessons.isPublished,
      is_preview: lessons.isPreview,
    })
    .from(lessons)
    .where(eq(lessons.slug, slug))
    .limit(1);

  if (!data) notFound();

  const templateRows = await db
    .select({
      id: lessonTemplates.id,
      title: lessonTemplates.title,
      description: lessonTemplates.description,
      kind: lessonTemplates.kind,
      file_url: lessonTemplates.fileUrl,
      sort: lessonTemplates.sort,
    })
    .from(lessonTemplates)
    .where(eq(lessonTemplates.lessonId, data.id))
    .orderBy(asc(lessonTemplates.sort), asc(lessonTemplates.createdAt));

  const existingTemplates: ExistingTemplate[] = templateRows as ExistingTemplate[];

  const defaults: LessonFormDefaults = {
    slug: data.slug,
    number: data.number,
    title: data.title,
    summary: data.summary ?? "",
    video_url: data.video_url ?? "",
    competency: data.competency ?? "",
    prompt_name: data.prompt_name ?? "",
    estimated_minutes: data.estimated_minutes ?? "",
    is_published: data.is_published ?? false,
    is_preview: data.is_preview ?? false,
  };

  return (
    <div className="space-y-8">
      <header className="border-b border-rule pb-4">
        <Link href="/admin/lessons" className="kicker hover:underline">
          ← Lessons
        </Link>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h1 className="display-title text-2xl">
              M{String(data.number).padStart(2, "0")} — {data.title}
            </h1>
            <p className="mt-1 font-mono text-xs text-muted-foreground">/lessons/{data.slug}</p>
          </div>
          <Link
            href={`/lessons/${data.slug}`}
            className="mono-link"
            target="_blank"
            rel="noreferrer"
          >
            View live ↗
          </Link>
        </div>
      </header>
      <LessonForm defaults={defaults} isEdit={true} />

      <section className="space-y-4 border-t border-rule pt-8">
        <header>
          <h2 className="display-title text-xl">Workbook templates</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload XLSX, CSV, or PDF templates for this lesson. Goes straight to the workbook tab.
            Static templates still appear alongside these.
          </p>
        </header>
        <TemplateUploader lessonSlug={data.slug} existing={existingTemplates} />
      </section>
    </div>
  );
}
