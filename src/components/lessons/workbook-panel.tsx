import { and, eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { ArtifactUploader } from "@/components/grading/artifact-uploader";
import { SubmissionHistory } from "@/components/grading/submission-history";
import { WorkbookScenarioCard } from "@/components/lessons/workbook-scenario-card";
import { db } from "@/db";
import { lessons, rubrics } from "@/db/schema";
import { getAppUser } from "@/lib/auth/session";
import { rubricCriteria, type Criterion } from "@/lib/grading/criteria";
import { RubricSchema } from "@/lib/grading/rubric";
import { canViewLesson } from "@/lib/lessons/access";
import { TEMPLATE_SHEETS } from "@/lib/lessons/template-sheets";
import { templatesFor, templatesForAsync, type Template } from "@/lib/lessons/templates";
import { getCurrentAssignment } from "@/lib/workbook/select";

/**
 * Workbook tab, top to bottom: Your task → Scenario → Template (one line per
 * sheet) → How this is graded → Reference examples → Upload → Your
 * submissions.
 */
export async function WorkbookPanel({ lessonSlug }: { lessonSlug: string }) {
  const user = await getAppUser();

  // lessons (was RLS): free preview lessons for everyone signed in, other
  // published lessons need has_access, admins see all.
  const [row] = user
    ? await db
        .select({
          id: lessons.id,
          competency: lessons.competency,
          isPublished: lessons.isPublished,
          isPreview: lessons.isPreview,
        })
        .from(lessons)
        .where(eq(lessons.slug, lessonSlug))
        .limit(1)
    : [];
  const lesson = user && row && (await canViewLesson(user.id, row)) ? row : null;

  // DB-backed templates are joined through lessons, which RLS used to
  // hide without access — fall back to the static catalog in that case.
  const templates = lesson ? await templatesForAsync(lessonSlug) : templatesFor(lessonSlug);
  const starter = templates.find((t) => t.kind === "starter");
  const examples = templates.filter((t) => t.kind === "example");

  // Current scenario for this user — falls back to lesson default, or null
  // if nothing's been seeded yet (the card surfaces a Generate CTA then).
  const currentAssignment =
    user && lesson ? await getCurrentAssignment({ userId: user.id, lessonId: lesson.id }) : null;

  const criteria = lesson ? await criteriaFor(lesson.competency) : null;

  return (
    <div className="space-y-8">
      {user ? (
        <WorkbookScenarioCard
          lessonSlug={lessonSlug}
          initialAssignment={currentAssignment}
          hasTemplate={!!starter}
        />
      ) : null}

      <section className="space-y-3">
        <SectionHeading>Your template</SectionHeading>
        {starter ? (
          <div className="space-y-3">
            <TemplateRow t={starter} />
            {TEMPLATE_SHEETS[starter.file]?.length ? (
              <ul className="space-y-1.5 rounded-md border border-rule p-4 text-sm">
                {TEMPLATE_SHEETS[starter.file].map((s) => (
                  <li key={s.sheet}>
                    <span className="font-medium text-ink">{s.sheet}</span>
                    <span className="text-muted-foreground"> — {s.what}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            There&apos;s no template for this lesson — write your response as a Word, PDF or Excel
            document.
          </p>
        )}
      </section>

      {criteria && criteria.items.length > 0 ? (
        <section className="space-y-3">
          <SectionHeading>How this is graded</SectionHeading>
          <ul className="space-y-2 text-sm">
            {criteria.items.map((c) => (
              <li key={c.label} className="flex gap-3">
                <span className="w-10 shrink-0 font-mono text-xs text-muted-foreground">
                  {c.weightPct}%
                </span>
                <span>
                  <span className="font-medium text-ink">{c.label}</span>
                  <span className="text-muted-foreground"> — {c.question}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Each is scored 1–5. You pass at {criteria.pass} or above overall; {criteria.hireReady}+
            is hire-ready.
          </p>
        </section>
      ) : null}

      {examples.length > 0 && (
        <section className="space-y-3">
          <SectionHeading>Reference examples</SectionHeading>
          <div className="space-y-3">
            {examples.map((t) => (
              <TemplateRow key={t.file} t={t} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <SectionHeading>Upload your completed workbook</SectionHeading>
        <ArtifactUploader lessonSlug={lessonSlug} />
      </section>

      {lesson && (
        <section className="space-y-3">
          <SectionHeading>Your submissions</SectionHeading>
          <SubmissionHistory lessonId={lesson.id} />
        </section>
      )}
    </div>
  );
}

/** Plain-language criteria from the lesson's current rubric (null if unavailable). */
async function criteriaFor(
  competency: string
): Promise<{ items: Criterion[]; pass: number; hireReady: number } | null> {
  const [r] = await db
    .select({ schema: rubrics.schemaJson })
    .from(rubrics)
    .where(and(eq(rubrics.competency, competency), eq(rubrics.isCurrent, true)))
    .limit(1);
  const parsed = r ? RubricSchema.safeParse(r.schema) : null;
  if (!parsed?.success) return null;
  return {
    items: rubricCriteria(parsed.data),
    pass: parsed.data.pass_threshold,
    hireReady: parsed.data.hire_ready_threshold,
  };
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h2>
  );
}

function TemplateRow({ t }: { t: Template }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border bg-card p-4">
      <div className="space-y-1">
        <h3 className="font-medium">{t.title}</h3>
        <p className="text-sm text-muted-foreground">{t.description}</p>
      </div>
      <Button asChild variant="outline" size="sm" className="shrink-0">
        <a href={t.file} download>
          Download
        </a>
      </Button>
    </div>
  );
}
