import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { MockInterviewForm } from "@/components/interviews/mock-interview-form";

export const metadata = { title: "Mock interview — Launchpad" };
export const dynamic = "force-dynamic";

export default async function InterviewScenarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const supabase = await createClient();

  const { data: scenario } = await supabase
    .from("mock_interview_scenarios")
    .select("id, slug, prompt, category, difficulty, competency")
    .eq("id", id)
    .eq("is_published", true)
    .maybeSingle();

  if (!scenario) notFound();

  const { data: response } = await supabase
    .from("mock_interview_responses")
    .select("response_text, status, overall_score, pass, feedback_summary, graded_at")
    .eq("user_id", user.id)
    .eq("scenario_id", scenario.id)
    .maybeSingle();

  return (
    <div className="space-y-8">
      <header className="border-b border-rule pb-4">
        <Link href="/interviews" className="kicker hover:underline">
          ← Mock interviews
        </Link>
        <div className="mt-2 flex flex-wrap items-baseline gap-3">
          <span className="kicker">{scenario.slug.toUpperCase()}</span>
          <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-[hsl(var(--accent))]">
            {scenario.category}
          </span>
          <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted-foreground">
            {scenario.difficulty}
          </span>
        </div>
        <h1 className="display-title mt-3 text-[1.8rem] leading-tight">{scenario.prompt}</h1>
      </header>

      <MockInterviewForm
        scenarioId={scenario.id}
        initialResponse={response?.response_text ?? ""}
        currentStatus={response?.status ?? null}
        currentScore={response?.overall_score ?? null}
        currentPass={response?.pass ?? null}
        currentFeedback={response?.feedback_summary ?? null}
      />
    </div>
  );
}
