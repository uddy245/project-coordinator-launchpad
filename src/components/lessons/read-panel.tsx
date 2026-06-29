import ReactMarkdown from "react-markdown";
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
  lessonTitle?: string;
};

const WORDS_PER_MINUTE = 220;

function readingTimeMinutes(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

function deriveTitle(body: string, fallback?: string): string {
  // The first H1 in the markdown is the article title. Strip it from
  // the body so the masthead can render it with editorial typography
  // instead of the default H1 inside the prose.
  const m = body.match(/^#\s+(.+)$/m);
  return m?.[1]?.trim() ?? fallback ?? "Reading";
}

function stripFirstH1(body: string): string {
  return body.replace(/^#\s+.+\n+/, "");
}

export function ReadPanel({ lessonSlug, lessonNumber, lessonTitle }: Props) {
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

  const title = deriveTitle(body, lessonTitle);
  const article = stripFirstH1(body);
  const minutes = readingTimeMinutes(article);
  const chapterLabel = typeof lessonNumber === "number" ? `Chapter ${lessonNumber}` : "Reading";

  return (
    <div className="read-paper overflow-hidden border border-[#d9dde4] bg-white">
      {/* Course-handout header */}
      <header className="border-b border-[#d9dde4] px-5 pb-6 pt-10 sm:px-14 sm:pb-8 sm:pt-12 lg:px-20">
        <div className="flex items-center justify-between gap-4">
          <span className="read-masthead">{chapterLabel} · Reading</span>
          <span className="read-masthead">{minutes} min</span>
        </div>
        <hr className="read-rule mt-3" />

        <h1 className="read-title">{title}</h1>
      </header>

      {/* Article body — textbook reading measure */}
      <article className="px-5 pb-16 pt-8 sm:px-14 sm:pt-10 lg:px-20">
        <div className="read-prose mx-auto max-w-[68ch]">
          <ReactMarkdown
            components={{
              // Let wide lesson tables scroll horizontally on small screens
              // instead of forcing the page to overflow.
              table: (props) => (
                <div className="overflow-x-auto">
                  <table {...props} />
                </div>
              ),
            }}
          >
            {article}
          </ReactMarkdown>
          <div className="read-end-mark">End of reading · Companion to {chapterLabel}</div>
        </div>
      </article>
    </div>
  );
}
