import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ScenarioForm, type ScenarioFormDefaults } from "@/components/admin/scenario-form";

export const metadata = { title: "Edit scenario — Admin" };
export const dynamic = "force-dynamic";

export default async function EditScenarioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug === "new") notFound();

  const admin = createAdminClient();
  const { data } = await admin
    .from("mock_interview_scenarios")
    .select(
      "id, slug, prompt, category, difficulty, competency, sort, is_published, rubric_summary"
    )
    .eq("slug", slug)
    .maybeSingle();

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
