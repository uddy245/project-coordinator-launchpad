import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Capstone — Launchpad" };
export const dynamic = "force-dynamic";

type Scenario = {
  id: string;
  slug: string;
  title: string;
  brief: string;
  required_artifacts: string[];
  estimated_hours: number | null;
  is_published: boolean;
};

type Attempt = {
  id: string;
  scenario_id: string;
  status: "in_progress" | "submitted" | "graded" | "withdrawn";
  started_at: string;
  graded_at: string | null;
  overall_score: number | null;
  pass: boolean | null;
};

const ARTIFACT_LABELS: Record<string, string> = {
  charter_brief: "Project charter brief",
  project_plan: "Project plan",
  raid_log: "RAID log",
  status_report_w4: "Status report — Week 4",
  status_report_w12: "Status report — Week 12",
  change_request: "Change request",
  closeout_note: "Closeout note",
};

export default async function CapstonePage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: scenarioData } = await supabase
    .from("capstone_scenarios")
    .select("id, slug, title, brief, required_artifacts, estimated_hours, is_published")
    .order("created_at", { ascending: true });
  const scenarios = (scenarioData ?? []) as Scenario[];

  const { data: attemptData } = await supabase
    .from("capstone_attempts")
    .select("id, scenario_id, status, started_at, graded_at, overall_score, pass")
    .eq("user_id", user.id);
  const attempts = (attemptData ?? []) as Attempt[];
  const attemptByScenario = new Map(attempts.map((a) => [a.scenario_id, a]));

  return (
    <div className="space-y-10">
      <header className="border-b border-rule pb-6">
        <span className="kicker">Gate 4 · Capstone</span>
        <h1 className="display-title mt-2 text-[2rem] sm:text-[2.4rem]">
          The hire-ready synthesis.
        </h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">
          A multi-artifact case study that draws on every module. The
          capstone is your portfolio piece — the thing a hiring manager
          can read end-to-end and form a real opinion of your judgment.
        </p>
      </header>

      {scenarios.length === 0 ? (
        <ComingSoon />
      ) : (
        <div className="space-y-6">
          {scenarios.map((s) => {
            const attempt = attemptByScenario.get(s.id);
            return (
              <article key={s.id} className="tile p-8">
                <div className="flex flex-wrap items-baseline justify-between gap-4">
                  <div>
                    <span className="kicker">CAPSTONE · {s.slug.toUpperCase()}</span>
                    <h2 className="display-title mt-2 text-2xl">{s.title}</h2>
                  </div>
                  {s.is_published ? (
                    <Status attempt={attempt} />
                  ) : (
                    <span className="kicker">Not yet published</span>
                  )}
                </div>

                <hr className="section-rule my-6" />

                <p className="whitespace-pre-line text-[0.95rem] leading-relaxed text-ink">
                  {s.brief}
                </p>

                {s.estimated_hours ? (
                  <p className="mt-4 kicker">
                    Estimated effort · {s.estimated_hours} hours over 1–2 weeks
                  </p>
                ) : null}

                <hr className="section-rule my-6" />

                <div>
                  <span className="kicker">Required artifacts</span>
                  <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {s.required_artifacts.map((a) => (
                      <li
                        key={a}
                        className="flex items-center gap-2 border border-rule bg-paper px-3 py-2 text-sm"
                      >
                        <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-[hsl(var(--accent))]">
                          ·
                        </span>
                        {ARTIFACT_LABELS[a] ?? a}
                      </li>
                    ))}
                  </ul>
                </div>

                {s.is_published ? (
                  <div className="mt-6">
                    <a
                      href={`/capstone/${s.slug}`}
                      className="mono-link"
                    >
                      Open capstone →
                    </a>
                  </div>
                ) : (
                  <div className="mt-6 border-l-4 border-[hsl(var(--accent))] bg-paper px-4 py-3 text-sm text-ink">
                    The case study and rubric are in production. The capstone
                    will open once the full programme ships.
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Status({ attempt }: { attempt: Attempt | undefined }) {
  if (!attempt) {
    return <span className="pip">Not started</span>;
  }
  if (attempt.status === "graded") {
    return (
      <span className="pip" data-status={attempt.pass ? "completed" : "in_progress"}>
        {attempt.pass
          ? `Passed · ${attempt.overall_score?.toFixed(1) ?? "?"}`
          : `Needs revision · ${attempt.overall_score?.toFixed(1) ?? "?"}`}
      </span>
    );
  }
  return <span className="pip" data-status="in_progress">{attempt.status}</span>;
}

function ComingSoon() {
  return (
    <div className="border border-rule bg-paper p-12 text-center">
      <span className="kicker">Coming soon</span>
      <h2 className="display-title mt-3 text-xl">
        Your hire-ready synthesis lives here.
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
        The capstone draws on the full programme. We&apos;re sequencing the
        case study and rubric to ship after Module 25 — once you&apos;ve
        had every concept put in front of you. In the meantime, your
        portfolio entries (Gate 2) are how you show progress.
      </p>
    </div>
  );
}
