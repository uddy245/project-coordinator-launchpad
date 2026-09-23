import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { capstoneScenarios } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/require-user";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Capstones — Admin" };
export const dynamic = "force-dynamic";

type CapstoneRow = {
  id: string;
  slug: string;
  title: string;
  required_artifacts: string[];
  estimated_hours: number | null;
  is_published: boolean;
  updated_at: string;
};

export default async function AdminCapstonesPage() {
  // Layout already gates; repeated here as defence in depth (no RLS).
  await requireAdmin();
  const capstones: CapstoneRow[] = await db
    .select({
      id: capstoneScenarios.id,
      slug: capstoneScenarios.slug,
      title: capstoneScenarios.title,
      required_artifacts: capstoneScenarios.requiredArtifacts,
      estimated_hours: capstoneScenarios.estimatedHours,
      is_published: capstoneScenarios.isPublished,
      updated_at: capstoneScenarios.updatedAt,
    })
    .from(capstoneScenarios)
    .orderBy(asc(capstoneScenarios.createdAt));

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-baseline justify-between gap-4 border-b border-rule pb-4">
        <div>
          <span className="kicker">Admin · Content</span>
          <h1 className="display-title mt-1 text-2xl">Capstone scenarios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Multi-artifact case studies for Gate 4. Plan to ship one full capstone after Module 25.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/capstones/new">+ New capstone</Link>
        </Button>
      </header>

      {capstones.length === 0 ? (
        <div className="border border-rule p-8 text-center">
          <span className="kicker">No capstones yet.</span>
        </div>
      ) : (
        <div className="space-y-2">
          {capstones.map((c) => (
            <Link key={c.id} href={`/admin/capstones/${c.slug}`} className="tile block p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="kicker">{c.slug.toUpperCase()}</span>
                {c.is_published ? (
                  <span className="rounded-sm bg-[hsl(var(--status-complete))] px-2 py-0.5 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-white">
                    Published
                  </span>
                ) : (
                  <span className="rounded-sm bg-[hsl(var(--muted))] px-2 py-0.5 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Draft
                  </span>
                )}
                {c.estimated_hours ? (
                  <span className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                    {c.estimated_hours}h
                  </span>
                ) : null}
                <span className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                  {c.required_artifacts.length} artifact
                  {c.required_artifacts.length === 1 ? "" : "s"}
                </span>
              </div>
              <h3 className="display-title mt-2 text-[1.15rem]">{c.title}</h3>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
