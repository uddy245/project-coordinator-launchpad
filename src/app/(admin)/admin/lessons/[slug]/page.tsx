import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { LessonForm, type LessonFormDefaults } from "@/components/admin/lesson-form";

export const metadata = { title: "Edit lesson — Admin" };
export const dynamic = "force-dynamic";

export default async function EditLessonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // The /admin/lessons/new route lives next to this; bail early so we don't
  // mistake the literal "new" path for a slug.
  if (slug === "new") notFound();

  const admin = createAdminClient();
  const { data } = await admin
    .from("lessons")
    .select(
      "slug, number, title, summary, video_url, competency, prompt_name, estimated_minutes, is_published, is_preview",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!data) notFound();

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
            <p className="mt-1 text-xs text-muted-foreground font-mono">
              /lessons/{data.slug}
            </p>
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
    </div>
  );
}
