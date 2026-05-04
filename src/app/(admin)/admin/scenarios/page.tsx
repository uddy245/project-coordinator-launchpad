import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Mock interview scenarios — Admin" };
export const dynamic = "force-dynamic";

type ScenarioRow = {
  id: string;
  slug: string;
  prompt: string;
  category: string;
  difficulty: string;
  competency: string;
  sort: number;
  is_published: boolean;
  updated_at: string;
};

export default async function AdminScenariosPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("mock_interview_scenarios")
    .select("id, slug, prompt, category, difficulty, competency, sort, is_published, updated_at")
    .order("sort", { ascending: true });

  const scenarios = (data ?? []) as ScenarioRow[];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-baseline justify-between gap-4 border-b border-rule pb-4">
        <div>
          <span className="kicker">Admin · Content</span>
          <h1 className="display-title mt-1 text-2xl">Mock interview scenarios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Behavioural / procedural / judgment prompts. Add more as new modules ship.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/scenarios/new">+ New scenario</Link>
        </Button>
      </header>

      {scenarios.length === 0 ? (
        <div className="border border-rule p-8 text-center">
          <span className="kicker">No scenarios yet.</span>
        </div>
      ) : (
        <div className="space-y-2">
          {scenarios.map((s) => (
            <Link key={s.id} href={`/admin/scenarios/${s.slug}`} className="tile block p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="kicker">{s.slug.toUpperCase()}</span>
                <span className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[hsl(var(--accent))]">
                  {s.category}
                </span>
                <span className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                  {s.difficulty}
                </span>
                {s.is_published ? (
                  <span className="rounded-sm bg-[hsl(var(--status-complete))] px-2 py-0.5 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-white">
                    Published
                  </span>
                ) : (
                  <span className="rounded-sm bg-[hsl(var(--muted))] px-2 py-0.5 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Draft
                  </span>
                )}
                <span className="ml-auto font-mono text-[0.65rem] text-muted-foreground">
                  sort {s.sort}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-ink">{s.prompt}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
