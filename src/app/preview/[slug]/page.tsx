import Link from "next/link";
import { notFound } from "next/navigation";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ReactMarkdown from "react-markdown";
import { createServerClient } from "@supabase/ssr";
import { Button } from "@/components/ui/button";
import { VideoPlayer } from "@/components/lessons/video-player";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return { title: `Preview — ${slug}` };
}

/**
 * Anonymous-friendly Supabase client. Bypasses the SSR cookie helpers
 * so we never read the session here — preview is intentionally public.
 */
function anonClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    }
  );
}

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = anonClient();

  // RLS only returns rows where is_preview=true and is_published=true,
  // so we don't need to filter here — but we do for query economy.
  const { data: lesson } = await supabase
    .from("lessons")
    .select("number, title, summary, video_url")
    .eq("slug", slug)
    .eq("is_preview", true)
    .eq("is_published", true)
    .maybeSingle();

  if (!lesson) {
    notFound();
  }

  // Read the companion markdown — same source the auth'd lesson page uses.
  let body: string | null = null;
  try {
    body = readFileSync(join(process.cwd(), "docs", "lessons", `${slug}.md`), "utf8");
  } catch {
    body = null;
  }

  const moduleCode = `M${String(lesson.number).padStart(2, "0")}`;
  const stripFirstH1 = (s: string) => s.replace(/^#\s+.+\n+/, "");
  const article = body ? stripFirstH1(body) : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Top strip — programme badge + signup CTA */}
      <header className="border-b border-rule">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="flex items-baseline gap-3">
            <span className="font-display text-xl font-semibold leading-none text-ink">
              Launchpad
            </span>
            <span className="hidden h-3 w-px bg-rule sm:block" aria-hidden />
            <span className="kicker hidden sm:inline-block">PROG·PC·25</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="mono-link">
              Sign in
            </Link>
            <Button asChild size="sm">
              <Link href="/signup">Begin the programme</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Preview banner */}
      <section className="border-b border-rule bg-paper">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="kicker">Free preview · {moduleCode}</span>
            <span className="h-3 w-px bg-rule" aria-hidden />
            <span className="text-sm text-muted-foreground">
              Watch the video, read the companion. Workbook and quiz are part of the
              full programme.
            </span>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/signup">Unlock the full module</Link>
          </Button>
        </div>
      </section>

      {/* Lesson header */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl space-y-4 px-6 py-8">
          <div className="flex items-baseline gap-3">
            <span className="data-numeral text-[1.5rem] leading-none text-[hsl(var(--accent))]">
              {moduleCode}
            </span>
            <span className="h-3 w-px bg-rule" aria-hidden />
            <span className="kicker">Project Coordinator Launchpad · Preview</span>
          </div>
          <h1 className="display-title text-[2rem] sm:text-[2.4rem] lg:text-[2.8rem]">
            {lesson.title}
          </h1>
          {lesson.summary ? (
            <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
              {lesson.summary}
            </p>
          ) : null}
        </div>
      </section>

      {/* Video */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-8">
          <VideoPlayer lessonSlug={slug} videoUrl={lesson.video_url} />
          <p className="mt-3 text-xs text-muted-foreground">
            Progress isn&apos;t saved in preview mode.{" "}
            <Link
              href="/signup"
              className="underline decoration-[hsl(var(--accent))] decoration-2 underline-offset-[5px]"
            >
              Sign up
            </Link>{" "}
            to track your progress.
          </p>
        </div>
      </section>

      {/* Companion reading */}
      {article ? (
        <section className="border-b border-rule bg-paper">
          <div className="mx-auto max-w-3xl px-6 py-12">
            <div className="kicker mb-3">Companion reading</div>
            <article className="prose prose-neutral max-w-none">
              <ReactMarkdown>{article}</ReactMarkdown>
            </article>
          </div>
        </section>
      ) : null}

      {/* Locked features */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-12">
          <div className="kicker mb-3">What you get with the full programme</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <LockedTile
              kicker="Workbook"
              title="Submit a real artifact, AI-graded against a rubric"
              detail="Each module ships with a starter template + 3 industry samples. Your submission goes into your portfolio."
            />
            <LockedTile
              kicker="Quiz"
              title="20 distractor-rationaled questions per module"
              detail="Tests your understanding, not your memory. Wrong answers come with reasoning."
            />
            <LockedTile
              kicker="Portfolio"
              title="A reviewable record of your work"
              detail="7 graded artifacts unlocks Gate 2 — the portfolio milestone hiring managers can actually see."
            />
            <LockedTile
              kicker="Progress"
              title="Career gates from Foundations to hire-ready"
              detail="Gate 1: Foundations. Gate 2: Portfolio. Gate 3: Mock interviews. Gate 4: Industry capstone."
            />
          </div>
          <div className="mt-8 flex items-center gap-3">
            <Button asChild size="lg">
              <Link href="/signup">Begin the programme</Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-6">
          <span className="kicker">Launchpad · 2026</span>
          <span className="kicker">PROG·PC·25 · A working PM&apos;s guide</span>
        </div>
      </footer>
    </div>
  );
}

function LockedTile({
  kicker,
  title,
  detail,
}: {
  kicker: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="bg-card p-6 tile">
      <div className="flex items-center justify-between">
        <span className="kicker">{kicker}</span>
        <span className="kicker text-[hsl(var(--muted-foreground))]">Locked</span>
      </div>
      <h3 className="mt-2 font-display text-lg font-semibold text-ink leading-snug">
        {title}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}
