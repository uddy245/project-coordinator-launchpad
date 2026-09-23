import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { capstoneScenarios } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/require-user";
import { CapstoneForm, type CapstoneFormDefaults } from "@/components/admin/capstone-form";

export const metadata = { title: "Edit capstone — Admin" };
export const dynamic = "force-dynamic";

export default async function EditCapstonePage({ params }: { params: Promise<{ slug: string }> }) {
  // Layout already gates; repeated here as defence in depth (no RLS).
  await requireAdmin();
  const { slug } = await params;
  if (slug === "new") notFound();

  const [data] = await db
    .select({
      id: capstoneScenarios.id,
      slug: capstoneScenarios.slug,
      title: capstoneScenarios.title,
      brief: capstoneScenarios.brief,
      required_artifacts: capstoneScenarios.requiredArtifacts,
      estimated_hours: capstoneScenarios.estimatedHours,
      is_published: capstoneScenarios.isPublished,
      rubric_summary: capstoneScenarios.rubricSummary,
    })
    .from(capstoneScenarios)
    .where(eq(capstoneScenarios.slug, slug))
    .limit(1);

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
