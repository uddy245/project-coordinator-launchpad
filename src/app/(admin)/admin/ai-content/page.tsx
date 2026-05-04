import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  DeleteQuizItemButton,
  TogglePublishScenarioButton,
  DeleteScenarioButton,
  DeleteWorkbookAssignmentButton,
} from "@/components/admin/ai-content-actions";

export const metadata = { title: "AI content — Admin" };
export const dynamic = "force-dynamic";

type LessonLookup = Map<string, { slug: string; title: string; number: number }>;

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function lessonLabel(lookup: LessonLookup, lessonId: string): string {
  const l = lookup.get(lessonId);
  if (!l) return "(deleted lesson)";
  return `M${String(l.number).padStart(2, "0")} · ${l.title}`;
}

export default async function AiContentPage() {
  const admin = createAdminClient();

  // Fetch all three AI-content tables + a lessons lookup in parallel.
  const [
    { data: quizRows },
    { data: scenarioRows },
    { data: workbookRows },
    { data: lessonsRows },
  ] = await Promise.all([
    admin
      .from("quiz_items")
      .select("id, lesson_id, sort, stem, options, correct, competency, difficulty, generated_at")
      .eq("is_ai_generated", true)
      .order("generated_at", { ascending: false, nullsFirst: false })
      .limit(200),
    admin
      .from("mock_interview_scenarios")
      .select("id, slug, prompt, category, difficulty, competency, is_published, generated_at")
      .eq("is_ai_generated", true)
      .order("generated_at", { ascending: false, nullsFirst: false })
      .limit(200),
    admin
      .from("workbook_assignments")
      .select("id, lesson_id, title, brief, generated_at")
      .eq("is_ai_generated", true)
      .order("generated_at", { ascending: false, nullsFirst: false })
      .limit(200),
    admin.from("lessons").select("id, slug, title, number"),
  ]);

  const lessonLookup: LessonLookup = new Map(
    (lessonsRows ?? []).map((l) => [l.id, { slug: l.slug, title: l.title, number: l.number }])
  );

  const quizCount = quizRows?.length ?? 0;
  const scenarioCount = scenarioRows?.length ?? 0;
  const workbookCount = workbookRows?.length ?? 0;

  return (
    <div className="space-y-10">
      <header className="border-b border-rule pb-4">
        <h1 className="display-title text-2xl">AI-generated content</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Everything Claude has produced for the shared pools. Spot-check quality, unpublish a
          scenario you don&apos;t want learners seeing, or delete outright. Hand-authored content is
          not shown here — go to the relevant edit page for those.
        </p>
        <div className="mt-3 flex flex-wrap gap-6 text-xs">
          <span className="kicker">
            Quiz items: <span className="data-numeral">{quizCount}</span>
          </span>
          <span className="kicker">
            Scenarios: <span className="data-numeral">{scenarioCount}</span>
          </span>
          <span className="kicker">
            Workbook briefs: <span className="data-numeral">{workbookCount}</span>
          </span>
        </div>
      </header>

      {/* ──────────────────────────── Quiz items ─────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between border-b border-rule pb-2">
          <h2 className="kicker">Quiz items · {quizCount}</h2>
        </div>
        {quizCount === 0 ? (
          <p className="text-sm text-muted-foreground">
            No AI-generated quiz items yet. Learners haven&apos;t exhausted any lesson&apos;s
            authored pool, or this is a fresh DB.
          </p>
        ) : (
          <div className="space-y-2">
            {(quizRows ?? []).map((q) => {
              const opts = q.options as { id: string; text: string }[];
              return (
                <article
                  key={q.id}
                  className="space-y-2 rounded-md border border-rule bg-paper p-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <div className="space-x-3 text-xs text-muted-foreground">
                      <span className="kicker">{lessonLabel(lessonLookup, q.lesson_id)}</span>
                      <span className="font-mono uppercase tracking-[0.12em]">
                        {q.competency} · {q.difficulty}
                      </span>
                      <span className="font-mono">#{q.sort}</span>
                      <span>{fmtDate(q.generated_at)}</span>
                    </div>
                    <DeleteQuizItemButton id={q.id} />
                  </div>
                  <p className="text-sm font-medium leading-snug text-ink">{q.stem}</p>
                  <ul className="space-y-1 pl-1 text-sm text-muted-foreground">
                    {opts.map((o) => (
                      <li key={o.id}>
                        <span
                          className={
                            "mr-2 font-mono text-xs uppercase " +
                            (o.id === q.correct
                              ? "text-[hsl(var(--accent))]"
                              : "text-muted-foreground")
                          }
                        >
                          {o.id}
                          {o.id === q.correct ? " ✓" : ""}
                        </span>
                        {o.text}
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ──────────────────── Mock-interview scenarios ───────────────── */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between border-b border-rule pb-2">
          <h2 className="kicker">Mock-interview scenarios · {scenarioCount}</h2>
        </div>
        {scenarioCount === 0 ? (
          <p className="text-sm text-muted-foreground">No AI-generated scenarios yet.</p>
        ) : (
          <div className="space-y-2">
            {(scenarioRows ?? []).map((s) => (
              <article key={s.id} className="space-y-2 rounded-md border border-rule bg-paper p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div className="space-x-3 text-xs text-muted-foreground">
                    <span className="kicker">{s.slug.toUpperCase()}</span>
                    <span className="font-mono uppercase tracking-[0.12em] text-[hsl(var(--accent))]">
                      {s.category}
                    </span>
                    <span className="font-mono uppercase tracking-[0.12em]">{s.difficulty}</span>
                    <span className="font-mono">{s.competency}</span>
                    <span>{fmtDate(s.generated_at)}</span>
                    {!s.is_published ? (
                      <span className="font-mono uppercase tracking-[0.12em] text-[hsl(var(--destructive))]">
                        unpublished
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-4">
                    <Link
                      href={`/admin/scenarios/${s.slug}`}
                      className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
                    >
                      Edit
                    </Link>
                    <TogglePublishScenarioButton id={s.id} isPublished={s.is_published} />
                    <DeleteScenarioButton id={s.id} />
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-ink">{s.prompt}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ─────────────────────── Workbook scenarios ──────────────────── */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between border-b border-rule pb-2">
          <h2 className="kicker">Workbook scenarios · {workbookCount}</h2>
        </div>
        {workbookCount === 0 ? (
          <p className="text-sm text-muted-foreground">No AI-generated workbook scenarios yet.</p>
        ) : (
          <div className="space-y-2">
            {(workbookRows ?? []).map((w) => (
              <article key={w.id} className="space-y-2 rounded-md border border-rule bg-paper p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div className="space-x-3 text-xs text-muted-foreground">
                    <span className="kicker">{lessonLabel(lessonLookup, w.lesson_id)}</span>
                    <span>{fmtDate(w.generated_at)}</span>
                  </div>
                  <DeleteWorkbookAssignmentButton id={w.id} />
                </div>
                <h3 className="text-base font-medium leading-snug text-ink">{w.title}</h3>
                <p className="line-clamp-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {w.brief}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
