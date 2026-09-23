import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { capstoneArtifacts, capstoneAttempts, capstoneScenarios } from "@/db/schema";
import { hasAccess } from "@/lib/auth/session";
import { CapstoneWorkspace, type ArtifactSlot } from "@/components/capstone/capstone-workspace";

export const metadata = { title: "Capstone — Launchpad" };
export const dynamic = "force-dynamic";

const ARTIFACT_LABELS: Record<string, string> = {
  charter_brief: "Project charter brief",
  project_plan: "Project plan",
  raid_log: "RAID log",
  status_report_w4: "Status report — Week 4",
  status_report_w12: "Status report — Week 12",
  change_request: "Change request",
  closeout_note: "Closeout note",
};

export default async function CapstoneScenarioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await requireUser();
  const { slug } = await params;

  // capstone_scenarios (was RLS): published AND has_access. Admins could
  // read unpublished rows, but this page 404s on unpublished anyway.
  if (!(await hasAccess(user.id))) notFound();

  const [scenario] = await db
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
    .where(and(eq(capstoneScenarios.slug, slug), eq(capstoneScenarios.isPublished, true)))
    .limit(1);

  if (!scenario || !scenario.is_published) notFound();

  // capstone_attempts / capstone_artifacts: owner only.
  const [attempt] = await db
    .select({
      id: capstoneAttempts.id,
      status: capstoneAttempts.status,
      started_at: capstoneAttempts.startedAt,
      submitted_at: capstoneAttempts.submittedAt,
      graded_at: capstoneAttempts.gradedAt,
      overall_score: capstoneAttempts.overallScore,
      pass: capstoneAttempts.pass,
    })
    .from(capstoneAttempts)
    .where(and(eq(capstoneAttempts.userId, user.id), eq(capstoneAttempts.scenarioId, scenario.id)))
    .orderBy(desc(capstoneAttempts.startedAt))
    .limit(1);

  const artifacts = attempt
    ? await db
        .select({
          kind: capstoneArtifacts.kind,
          file_name: capstoneArtifacts.fileName,
          created_at: capstoneArtifacts.createdAt,
        })
        .from(capstoneArtifacts)
        .where(
          and(eq(capstoneArtifacts.attemptId, attempt.id), eq(capstoneArtifacts.userId, user.id))
        )
    : [];

  const artifactByKind = new Map(artifacts.map((a) => [a.kind, a]));

  const required = (scenario.required_artifacts ?? []) as string[];
  const artifactSlots: ArtifactSlot[] = required.map((kind) => {
    const a = artifactByKind.get(kind);
    return {
      kind,
      label: ARTIFACT_LABELS[kind] ?? kind.replace(/_/g, " "),
      uploadedFileName: a?.file_name ?? null,
      uploadedAt: a?.created_at ?? null,
    };
  });

  return (
    <div className="space-y-8">
      <header className="border-b border-rule pb-6">
        <Link href="/capstone" className="kicker hover:underline">
          ← Capstone overview
        </Link>
        <span className="kicker mt-3 block">CAPSTONE · {scenario.slug.toUpperCase()}</span>
        <h1 className="display-title mt-2 text-[2rem] sm:text-[2.4rem]">{scenario.title}</h1>
        {scenario.estimated_hours ? (
          <p className="kicker mt-2">
            Estimated effort · {scenario.estimated_hours} hours over 1–2 weeks
          </p>
        ) : null}
      </header>

      <section className="tile p-8">
        <span className="kicker">Brief</span>
        <p className="mt-3 whitespace-pre-line text-[0.95rem] leading-relaxed text-ink">
          {scenario.brief}
        </p>
      </section>

      <section className="space-y-4">
        <header>
          <h2 className="display-title text-xl">Your submission</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload each artifact independently. Replace any of them at any time until you submit.
            The capstone is graded as a single package.
          </p>
        </header>
        <CapstoneWorkspace
          scenarioSlug={scenario.slug}
          attemptId={attempt?.id ?? null}
          attemptStatus={
            (attempt?.status ?? null) as "in_progress" | "submitted" | "graded" | "withdrawn" | null
          }
          artifactSlots={artifactSlots}
          rubricSummary={scenario.rubric_summary ?? null}
        />
      </section>

      {attempt?.status === "graded" && attempt.overall_score !== null ? (
        <section className="border-l-4 border-[hsl(var(--status-complete))] bg-paper px-5 py-4">
          <span className="kicker">Result</span>
          <div className="mt-2 flex flex-wrap items-baseline gap-3">
            <span className="data-numeral text-2xl text-ink">
              {attempt.overall_score?.toFixed(1)} / 5
            </span>
            <span
              className={`rounded-sm px-2 py-0.5 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.12em] ${
                attempt.pass
                  ? "bg-[hsl(var(--status-complete))] text-white"
                  : "bg-[hsl(var(--accent))] text-white"
              }`}
            >
              {attempt.pass ? "Hire-ready" : "Needs revision"}
            </span>
          </div>
        </section>
      ) : null}
    </div>
  );
}
