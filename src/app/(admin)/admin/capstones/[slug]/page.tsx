import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { CapstoneForm, type CapstoneFormDefaults } from "@/components/admin/capstone-form";

export const metadata = { title: "Edit capstone — Admin" };
export const dynamic = "force-dynamic";

export default async function EditCapstonePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug === "new") notFound();

  const admin = createAdminClient();
  const { data } = await admin
    .from("capstone_scenarios")
    .select(
      "id, slug, title, brief, required_artifacts, estimated_hours, is_published, rubric_summary"
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!data) notFound();

  const defaults: CapstoneFormDefaults = {
    id: data.id,
    slug: data.slug,
    title: data.title,
    brief: data.brief,
    required_artifacts: data.required_artifacts ?? [],
    estimated_hours: data.estimated_hours ?? "",
    is_published: data.is_published,
    rubric_summary: data.rubric_summary ?? "",
  };

  return (
    <div className="space-y-8">
      <header className="border-b border-rule pb-4">
        <Link href="/admin/capstones" className="kicker hover:underline">
          ← Capstones
        </Link>
        <h1 className="display-title mt-2 text-2xl">{data.title}</h1>
      </header>
      <CapstoneForm defaults={defaults} isEdit={true} />
    </div>
  );
}
