import { Button } from "@/components/ui/button";
import { ArtifactUploader } from "@/components/grading/artifact-uploader";
import { SubmissionHistory } from "@/components/grading/submission-history";
import { WorkbookScenarioCard } from "@/components/lessons/workbook-scenario-card";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { lessons } from "@/db/schema";
import { getAppUser, hasAccess, isAdmin } from "@/lib/auth/session";
import { templatesFor, templatesForAsync, type Template } from "@/lib/lessons/templates";
import { getCurrentAssignment } from "@/lib/workbook/select";

export async function WorkbookPanel({
  lessonSlug,
  lessonTitle,
}: {
  lessonSlug: string;
  lessonTitle: string;
}) {
  const user = await getAppUser();

  // lessons (was RLS): learners need has_access and only see published
  // rows; admins see all.
  const [admin, access] = user
    ? await Promise.all([isAdmin(user.id), hasAccess(user.id)])
    : [false, false];
  const [lesson] =
    user && access
      ? await db
          .select({ id: lessons.id })
          .from(lessons)
          .where(
            and(eq(lessons.slug, lessonSlug), admin ? undefined : eq(lessons.isPublished, true))
          )
          .limit(1)
      : [];

  // DB-backed templates are joined through lessons, which RLS used to
  // hide without access — fall back to the static catalog in that case.
  const templates = lesson ? await templatesForAsync(lessonSlug) : templatesFor(lessonSlug);
  const starter = templates.find((t) => t.kind === "starter");
  const examples = templates.filter((t) => t.kind === "example");

  // Current scenario for this user — falls back to lesson default, or null
  // if nothing's been seeded yet (the card surfaces a Generate CTA in that case).
  const currentAssignment =
    user && lesson
      ? await getCurrentAssignment({
          userId: user.id,
          lessonId: lesson.id,
        })
      : null;

  return (
    <div className="space-y-6">
      {user ? (
        <WorkbookScenarioCard lessonSlug={lessonSlug} initialAssignment={currentAssignment} />
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Your template
        </h2>
        {starter ? (
          <TemplateRow t={starter} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Templates for this lesson aren&apos;t ready yet.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Submit your artifact
        </h2>
        <ArtifactUploader lessonSlug={lessonSlug} lessonTitle={lessonTitle} />
      </section>

      {lesson && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Your submissions
          </h2>
          <SubmissionHistory lessonId={lesson.id} />
        </section>
      )}

      {examples.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Reference examples
          </h2>
          <div className="space-y-3">
            {examples.map((t) => (
              <TemplateRow key={t.file} t={t} />
            ))}
          </div>
        </section>
      )}
    </div>
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
