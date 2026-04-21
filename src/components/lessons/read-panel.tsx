import { readFileSync } from "node:fs";
import { join } from "node:path";
import ReactMarkdown from "react-markdown";

/**
 * Reads docs/lessons/<slug>.md at server-render time and renders it
 * as Markdown. Used for the Read tab on the lesson page. If the file
 * doesn't exist yet (most lessons), shows an empty-state placeholder.
 *
 * Intentional trade-off: committing lesson readings as Markdown in
 * git (rather than storing them in the DB) keeps content versioned
 * alongside code changes and avoids yet another table. The cost is
 * that content edits require a deploy — fine for the current pace.
 */
export function ReadPanel({ lessonSlug }: { lessonSlug: string }) {
  const path = join(process.cwd(), "docs", "lessons", `${lessonSlug}.md`);
  let body: string | null = null;
  try {
    body = readFileSync(path, "utf8");
  } catch {
    body = null;
  }

  if (!body) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground">
          Written companion reading for this lesson isn&apos;t available yet. Check the Video and
          Workbook tabs.
        </p>
      </div>
    );
  }

  return (
    <article className="prose prose-neutral dark:prose-invert max-w-none">
      <ReactMarkdown>{body}</ReactMarkdown>
    </article>
  );
}
