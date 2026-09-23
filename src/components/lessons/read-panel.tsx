import { MarkdownProse } from "@/components/ui/markdown-prose";
import { getLessonReading } from "@/lib/lessons/reading";

/**
 * Read tab — editorial reading experience.
 *
 * Aesthetic: "Reader's Quarterly". Warm cream paper, distinctive serif,
 * drop cap, ornamental dividers, optimal 64ch measure. The fonts and
 * styles live in src/app/globals.css under .read-prose.
 *
 * Content source: docs/lessons/<slug>.md committed to git. Versioned
 * alongside code; content edits require a deploy. Acceptable trade-off
 * given current pace.
 */

type Props = {
  lessonSlug: string;
  lessonNumber?: number;
};

const WORDS_PER_MINUTE = 220;

function readingTimeMinutes(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

// The markdown's first H1 repeats the lesson title, which the page header
// already shows — strip it so the title appears once.
function stripFirstH1(body: string): string {
  return body.replace(/^#\s+.+\n+/, "");
}

export function ReadPanel({ lessonSlug, lessonNumber }: Props) {
  const body = getLessonReading(lessonSlug);

  if (!body) {
    return (
      <div className="rounded-lg border bg-card p-12 text-center">
        <p className="font-serif italic text-muted-foreground">
          The companion reading for this lesson hasn&apos;t been set yet. Check back soon — or watch
          the video.
        </p>
      </div>
    );
  }

  const article = stripFirstH1(body);
  const minutes = readingTimeMinutes(article);
  const chapterLabel = typeof lessonNumber === "number" ? `Chapter ${lessonNumber}` : "Reading";

  return (
    <div className="read-paper overflow-hidden border border-[#d9dde4] bg-white">
      {/* Course-handout header */}
      <header className="border-b border-[#d9dde4] px-5 pb-4 pt-8 sm:px-14 sm:pb-5 sm:pt-10 lg:px-20">
        <div className="flex items-center justify-between gap-4">
          <span className="read-masthead">{chapterLabel} · Reading</span>
          <span className="read-masthead">{minutes} min</span>
        </div>
        <hr className="read-rule mt-3" />
      </header>

      {/* Article body — textbook reading measure */}
      <article className="px-5 pb-16 pt-8 sm:px-14 sm:pt-10 lg:px-20">
        <div className="mx-auto max-w-[68ch]">
          <MarkdownProse content={article} />
          <div className="read-end-mark">End of reading · Companion to {chapterLabel}</div>
        </div>
      </article>
    </div>
  );
}
