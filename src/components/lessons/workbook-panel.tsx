import { Button } from "@/components/ui/button";
import { ArtifactUploader } from "@/components/grading/artifact-uploader";
import { SubmissionHistory } from "@/components/grading/submission-history";
import { createClient } from "@/lib/supabase/server";
import { templatesForAsync, type Template } from "@/lib/lessons/templates";

export async function WorkbookPanel({
  lessonSlug,
  lessonTitle,
}: {
  lessonSlug: string;
  lessonTitle: string;
}) {
  const supabase = await createClient();
  const templates = await templatesForAsync(supabase, lessonSlug);
  const starter = templates.find((t) => t.kind === "starter");
  const examples = templates.filter((t) => t.kind === "example");

  const { data: lesson } = await supabase
    .from("lessons")
    .select("id")
    .eq("slug", lessonSlug)
    .maybeSingle();

  return (
    <div className="space-y-6">
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
