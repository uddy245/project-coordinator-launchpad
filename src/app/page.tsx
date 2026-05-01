import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      {/* Top bar — programme identifier */}
      <header className="border-b border-rule">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-xl font-semibold leading-none text-ink">
              Launchpad
            </span>
            <span className="hidden h-3 w-px bg-rule sm:block" aria-hidden />
            <span className="kicker hidden sm:inline-block">PROG·PC·25</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="/login" className="mono-link">
              Sign in
            </Link>
            <Button asChild size="sm">
              <Link href="/signup">Apply</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-rule">
        <div className="mx-auto grid max-w-6xl grid-cols-12 gap-6 px-6 py-16 lg:py-24">
          <div className="col-span-12 lg:col-span-8 space-y-6">
            <span className="kicker">A 25-module career programme · Self-paced</span>
            <h1 className="display-title text-[2.6rem] leading-[1.04] sm:text-[3.6rem] lg:text-[4.4rem]">
              From zero to{" "}
              <span className="text-[hsl(var(--accent))]">hire-ready</span>{" "}
              project coordinator.
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Twenty-five modules built from a working PM&apos;s handbook. Real
              artifacts, AI-graded against rubrics, and a portfolio you can
              actually show in interviews. Designed for the early-career
              professional who wants the role.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button asChild size="lg">
                <Link href="/signup">Begin the programme</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/preview/coordinator-role">Preview Module 01</Link>
              </Button>
              <Button asChild variant="ghost" size="lg">
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
          </div>

          {/* Programme code card */}
          <aside className="col-span-12 mt-6 lg:col-span-4 lg:mt-0">
            <div className="border border-ink bg-paper">
              <div className="border-b border-rule px-5 py-3">
                <span className="kicker">Programme summary</span>
              </div>
              <dl className="divide-y divide-rule">
                <DefRow term="Code" value="PROG·PC·25" />
                <DefRow term="Modules" value="25" />
                <DefRow term="Format" value="Self-paced" />
                <DefRow term="Cohort" value="Rolling" />
                <DefRow term="Workload" value="~50 min / module" />
                <DefRow term="Outcome" value="Hire-ready PC" />
              </dl>
            </div>
          </aside>
        </div>
      </section>

      {/* Stats / outcomes strip */}
      <section className="border-b border-rule bg-paper">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px bg-rule lg:grid-cols-4">
          <Stat numeral="25" label="Modules" hint="One reading + one artifact each" />
          <Stat numeral="100+" label="Quiz items" hint="Distractor-rationaled MCQs" />
          <Stat numeral="04" label="Career gates" hint="Foundations → Capstone" />
          <Stat numeral="01" label="Portfolio" hint="A real one. Reviewable." />
        </div>
      </section>

      {/* Pillars */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="mb-8 flex items-baseline justify-between border-b border-rule pb-4">
            <span className="kicker">What you actually learn</span>
            <span className="kicker">Five pillars · Twenty-five modules</span>
          </div>
          <div className="grid gap-px bg-rule sm:grid-cols-2 lg:grid-cols-5">
            <Pillar code="01" name="The role" detail="Identity & orientation" />
            <Pillar code="02" name="The map" detail="Concepts & vocabulary" />
            <Pillar code="03" name="The artifacts" detail="Daily craft" />
            <Pillar code="04" name="Judgment" detail="Career-defining calls" />
            <Pillar code="05" name="The professional" detail="Career & path forward" />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b border-rule">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-12">
          <div>
            <div className="kicker">Ready to enrol?</div>
            <h2 className="display-title mt-1 text-2xl">
              Twenty-five modules. One outcome.
            </h2>
          </div>
          <div className="flex items-center gap-3">
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
          <span className="kicker">Launchpad</span>
          <span className="kicker">A working PM&apos;s guide · 2026</span>
        </div>
      </footer>
    </main>
  );
}

function DefRow({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-5 py-3">
      <dt className="kicker">{term}</dt>
      <dd className="font-mono text-sm font-medium text-ink tabular-nums">{value}</dd>
    </div>
  );
}

function Stat({
  numeral,
  label,
  hint,
}: {
  numeral: string;
  label: string;
  hint: string;
}) {
  return (
    <div className="bg-card px-6 py-7">
      <div className="data-numeral text-[2.4rem] leading-none text-ink">{numeral}</div>
      <div className="mt-3 kicker">{label}</div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}

function Pillar({
  code,
  name,
  detail,
}: {
  code: string;
  name: string;
  detail: string;
}) {
  return (
    <div className="bg-card px-5 py-7">
      <span className="kicker text-[hsl(var(--accent))]">Pillar {code}</span>
      <div className="mt-2 font-display text-lg font-semibold text-ink">{name}</div>
      <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
    </div>
  );
}
