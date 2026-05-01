import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import {
  CapstoneWorkspace,
  type ArtifactSlot,
} from "@/components/capstone/capstone-workspace";

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
  const supabase = await createClient();

  const { data: scenario } = await supabase
    .from("capstone_scenarios")
    .select(
      "id, slug, title, brief, required_artifacts, estimated_hours, is_published",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!scenario || !scenario.is_published) notFound();

  const { data: attempt } = await supabase
    .from("capstone_attempts")
    .select("id, status, started_at, submitted_at, graded_at, overall_score, pass")
    .eq("user_id", user.id)
    .eq("scenario_id", scenario.id)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: artifacts } = attempt
    ? await supabase
        .from("capstone_artifacts")
        .select("kind, file_name, created_at")
        .eq("attempt_id", attempt.id)
    : { data: [] as Array<{ kind: string; file_name: string; created_at: string }> };

  const artifactByKind = new Map(
    (artifacts ?? []).map((a) => [a.kind, a]),
  );

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
        <h1 className="display-title mt-2 text-[2rem] sm:text-[2.4rem]">
          {scenario.title}
        </h1>
        {scenario.estimated_hours ? (
          <p className="mt-2 kicker">
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
            Upload each artifact independently. Replace any of them at any time
            until you submit. The capstone is graded as a single package.
          </p>
        </header>
        <CapstoneWorkspace
          scenarioSlug={scenario.slug}
          attemptId={attempt?.id ?? null}
          attemptStatus={
            (attempt?.status ?? null) as
              | "in_progress"
              | "submitted"
              | "graded"
              | "withdrawn"
              | null
          }
          artifactSlots={artifactSlots}
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
