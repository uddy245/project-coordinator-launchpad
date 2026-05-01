import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { SearchForm } from "@/components/search/search-form";

export const metadata = { title: "Search — Launchpad" };
export const dynamic = "force-dynamic";

type SearchResult = {
  id: string;
  slug: string;
  number: number;
  title: string;
  summary: string | null;
  competency: string | null;
  rank: number;
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireUser();
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  let results: SearchResult[] = [];
  if (query.length >= 2) {
    const supabase = await createClient();
    // Use websearch_to_tsquery — handles user input safely (operators like
    // quotes, OR, -negation), no need to escape.
    const { data } = await supabase
      .rpc("search_lessons", { q: query })
      .limit(20);
    results = (data ?? []) as SearchResult[];
  }

  return (
    <div className="space-y-8">
      <header className="border-b border-rule pb-6">
        <span className="kicker">Programme search</span>
        <h1 className="display-title mt-2 text-[2rem] sm:text-[2.4rem]">
          Find a module
        </h1>
        <p className="mt-2 max-w-2xl text-base text-muted-foreground">
          Search across module titles, summaries, and competencies. Useful when
          you remember a topic but not which module covers it.
        </p>
      </header>

      <SearchForm initialQuery={query} />

      {query.length === 0 ? (
        <div className="border border-rule bg-paper p-8 text-center">
          <span className="kicker">Type a query above to search.</span>
        </div>
      ) : query.length < 2 ? (
        <div className="border border-rule bg-paper p-8 text-center">
          <span className="kicker">Need at least 2 characters.</span>
        </div>
      ) : results.length === 0 ? (
        <div className="border border-rule bg-paper p-8 text-center">
          <span className="kicker">No modules matched &ldquo;{query}&rdquo;.</span>
        </div>
      ) : (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between border-b border-rule pb-3">
            <h2 className="kicker">
              {results.length} {results.length === 1 ? "result" : "results"}
            </h2>
            <span className="kicker">Ranked by relevance</span>
          </div>
          {results.map((r) => (
            <Link
              key={r.id}
              href={`/lessons/${r.slug}`}
              className="tile flex items-stretch"
            >
              <div className="w-32 flex-shrink-0 border-r border-rule p-5 sm:w-40">
                <div className="kicker text-[0.7rem]">Module</div>
                <div className="data-numeral mt-1 text-[1.6rem] leading-none text-ink">
                  M{String(r.number).padStart(2, "0")}
                </div>
              </div>
              <div className="min-w-0 flex-1 p-5">
                <h3 className="display-title text-[1.25rem] leading-snug">
                  {r.title}
                </h3>
                {r.summary ? (
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {r.summary}
                  </p>
                ) : null}
                {r.competency ? (
                  <p className="mt-3 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-[hsl(var(--accent))]">
                    {r.competency.replace(/_/g, " ")}
                  </p>
                ) : null}
              </div>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
