import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { mockInterviewResponses, mockInterviewScenarios } from "@/db/schema";
import { MockInterviewForm } from "@/components/interviews/mock-interview-form";

export const metadata = { title: "Mock interview — Launchpad" };
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function InterviewScenarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  // Route param is used as a uuid; a malformed value would make Postgres
  // throw instead of returning no rows.
  if (!UUID_RE.test(id)) notFound();

  // mock_interview_scenarios: published, any signed-in user.
  const [scenario] = await db
    .select({
      id: mockInterviewScenarios.id,
      slug: mockInterviewScenarios.slug,
      prompt: mockInterviewScenarios.prompt,
      category: mockInterviewScenarios.category,
      difficulty: mockInterviewScenarios.difficulty,
      competency: mockInterviewScenarios.competency,
    })
    .from(mockInterviewScenarios)
    .where(and(eq(mockInterviewScenarios.id, id), eq(mockInterviewScenarios.isPublished, true)))
    .limit(1);

  if (!scenario) notFound();

  // mock_interview_responses: owner only.
  const [response] = await db
    .select({
      response_text: mockInterviewResponses.responseText,
      status: mockInterviewResponses.status,
      overall_score: mockInterviewResponses.overallScore,
      pass: mockInterviewResponses.pass,
      feedback_summary: mockInterviewResponses.feedbackSummary,
      graded_at: mockInterviewResponses.gradedAt,
    })
    .from(mockInterviewResponses)
    .where(
      and(
        eq(mockInterviewResponses.userId, user.id),
        eq(mockInterviewResponses.scenarioId, scenario.id)
      )
    )
    .limit(1);

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
        currentStatus={
          (response?.status ?? null) as
            | "graded_pending"
            | "grading"
            | "graded"
            | "grading_failed"
            | null
        }
        currentScore={response?.overall_score ?? null}
        currentPass={response?.pass ?? null}
        currentFeedback={response?.feedback_summary ?? null}
      />
    </div>
  );
}
