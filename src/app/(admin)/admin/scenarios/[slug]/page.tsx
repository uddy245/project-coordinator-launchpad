import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { mockInterviewScenarios } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/require-user";
import { ScenarioForm, type ScenarioFormDefaults } from "@/components/admin/scenario-form";

export const metadata = { title: "Edit scenario — Admin" };
export const dynamic = "force-dynamic";

export default async function EditScenarioPage({ params }: { params: Promise<{ slug: string }> }) {
  // Layout already gates; repeated here as defence in depth (no RLS).
  await requireAdmin();
  const { slug } = await params;
  if (slug === "new") notFound();

  const [data] = await db
    .select({
      id: mockInterviewScenarios.id,
      slug: mockInterviewScenarios.slug,
      prompt: mockInterviewScenarios.prompt,
      category: mockInterviewScenarios.category,
      difficulty: mockInterviewScenarios.difficulty,
      competency: mockInterviewScenarios.competency,
      sort: mockInterviewScenarios.sort,
      is_published: mockInterviewScenarios.isPublished,
      rubric_summary: mockInterviewScenarios.rubricSummary,
    })
    .from(mockInterviewScenarios)
    .where(eq(mockInterviewScenarios.slug, slug))
    .limit(1);

  if (!data) notFound();

  const defaults: ScenarioFormDefaults = {
    id: data.id,
    slug: data.slug,
    prompt: data.prompt,
    category: data.category as ScenarioFormDefaults["category"],
    difficulty: data.difficulty as ScenarioFormDefaults["difficulty"],
    competency: data.competency,
    sort: data.sort,
    is_published: data.is_published,
    rubric_summary: data.rubric_summary ?? "",
  };

  return (
    <div className="space-y-8">
      <header className="border-b border-rule pb-4">
        <Link href="/admin/scenarios" className="kicker hover:underline">
          ← Scenarios
        </Link>
        <h1 className="display-title mt-2 text-2xl">{data.slug.toUpperCase()}</h1>
      </header>
      <ScenarioForm defaults={defaults} isEdit={true} />
    </div>
  );
}
