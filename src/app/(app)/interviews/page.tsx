import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { GenerateMoreButton } from "@/components/interviews/generate-more-button";

export const metadata = { title: "Mock interviews — Launchpad" };
export const dynamic = "force-dynamic";

type ScenarioRow = {
  id: string;
  slug: string;
  prompt: string;
  category: "behavioural" | "procedural" | "judgment";
  difficulty: "easy" | "medium" | "hard";
  competency: string;
  sort: number;
};

type ResponseRow = {
  scenario_id: string;
  status: "graded_pending" | "grading" | "graded" | "grading_failed";
  overall_score: number | null;
  pass: boolean | null;
};

export default async function InterviewsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: scenariosData } = await supabase
    .from("mock_interview_scenarios")
    .select("id, slug, prompt, category, difficulty, competency, sort")
    .eq("is_published", true)
    .order("sort", { ascending: true });
  const scenarios = (scenariosData ?? []) as ScenarioRow[];

  const { data: responsesData } = await supabase
    .from("mock_interview_responses")
    .select("scenario_id, status, overall_score, pass")
    .eq("user_id", user.id);
  const responses = new Map(
    ((responsesData ?? []) as ResponseRow[]).map((r) => [r.scenario_id, r])
  );

  const passedCount = scenarios.filter((s) => responses.get(s.id)?.pass === true).length;

  return (
    <div className="space-y-10">
      <header className="border-b border-rule pb-6">
        <span className="kicker">Gate 3 · Mock interviews</span>
        <h1 className="display-title mt-2 text-[2rem] sm:text-[2.4rem]">
          Practise the conversations that get you hired.
        </h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">
          Behavioural, procedural, and judgment prompts grounded in real coordinator situations.
          Type your response — Claude grades it against the same dimension your modules build.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-px bg-rule lg:grid-cols-4">
        <Stat
          label="Scenarios"
          value={String(scenarios.length).padStart(2, "0")}
          hint="Published"
        />
        <Stat
          label="Passed"
          value={String(passedCount).padStart(2, "0")}
          hint={`of ${scenarios.length}`}
        />
        <Stat
          label="Status"
          value={
            passedCount >= scenarios.length && scenarios.length > 0
              ? "Gate 3 cleared"
              : "In progress"
          }
          hint="Career milestone"
        />
        <Stat label="Format" value="Type" hint="60-second rule of thumb · talk it out" />
      </section>

      {scenarios.length === 0 ? (
        <div className="border border-rule p-8 text-center">
          <span className="kicker">Scenarios coming soon.</span>
        </div>
      ) : (
        <section className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-rule pb-3">
            <h2 className="kicker">Prompts</h2>
            <div className="flex items-center gap-4">
              <GenerateMoreButton />
              <span className="kicker">Click to enter →</span>
            </div>
          </div>
          {scenarios.map((s) => {
            const r = responses.get(s.id);
            return (
              <Link key={s.id} href={`/interviews/${s.id}`} className="tile block p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="kicker">{s.slug.toUpperCase()}</span>
                  <span className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[hsl(var(--accent))]">
                    {s.category}
                  </span>
                  <span className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                    {s.difficulty}
                  </span>
                  <StatusPip status={r} />
                </div>
                <p className="mt-2 line-clamp-3 text-sm text-ink">{s.prompt}</p>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="bg-card p-6">
      <div className="kicker">{label}</div>
      <div className="data-numeral mt-2 text-[1.8rem] leading-none text-ink">{value}</div>
      <div className="mt-2 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}

function StatusPip({ status }: { status: ResponseRow | undefined }) {
  if (!status) {
    return <span className="pip">Not started</span>;
  }
  if (status.status === "graded") {
    return (
      <span className="pip" data-status={status.pass ? "completed" : "in_progress"}>
        {status.pass
          ? `Passed · ${status.overall_score?.toFixed(1) ?? "?"}`
          : `Needs revision · ${status.overall_score?.toFixed(1) ?? "?"}`}
      </span>
    );
  }
  if (status.status === "grading") {
    return (
      <span className="pip" data-status="in_progress">
        Grading…
      </span>
    );
  }
  if (status.status === "grading_failed") {
    return <span className="pip">Try again</span>;
  }
  return <span className="pip">In progress</span>;
}
