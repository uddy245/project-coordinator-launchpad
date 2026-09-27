import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileCheck2,
  GraduationCap,
  PlayCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-rule bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-xl bg-[hsl(var(--accent))] text-white">
              <GraduationCap className="size-4.5" strokeWidth={2.25} />
            </span>
            <span className="font-display text-lg font-bold leading-none text-ink">Launchpad</span>
          </div>
          <nav className="flex items-center gap-3">
            <Link href="/login" className="mono-link px-2">
              Sign in
            </Link>
            <Button asChild size="sm">
              <Link href="/signup">Apply</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-12 lg:pb-24 lg:pt-16">
        <div className="hero-warm grid grid-cols-1 gap-10 rounded-[28px] px-7 py-12 sm:px-10 sm:py-16 lg:grid-cols-12 lg:px-14">
          <div className="col-span-12 space-y-6 lg:col-span-7">
            <Chip tone="dark">
              <Clock3 className="size-3.5" /> A 25-module career programme · Self-paced
            </Chip>
            <h1 className="display-title text-[2.5rem] leading-[1.06] text-white sm:text-[3.2rem] lg:text-[3.7rem]">
              From zero to <span className="text-[#99F6E4]">hire-ready</span> project coordinator.
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-white/85">
              Twenty-five modules built from a working PM&apos;s handbook. Real artifacts, AI-graded
              against rubrics, and a portfolio you can actually show in interviews. Designed for the
              early-career professional who wants the role.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button asChild variant="white" size="lg">
                <Link href="/signup">
                  Begin the programme <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Link
                href="/preview/coordinator-role"
                className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 text-base font-bold text-white transition-colors hover:bg-white/15"
              >
                <PlayCircle className="size-4.5" /> Preview Module 01
              </Link>
            </div>
          </div>

          {/* Programme summary card, floating on the hero */}
          <aside className="col-span-12 lg:col-span-5">
            <div className="rounded-[22px] bg-white p-6 shadow-[0_24px_48px_-20px_rgba(0,0,0,0.45)] sm:p-7">
              <div className="kicker">Programme summary</div>
              <dl className="mt-4 divide-y divide-rule">
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
      <section className="border-y border-rule bg-[hsl(var(--secondary))]">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-6 py-12 lg:grid-cols-4">
          <Stat numeral="25" label="Modules" hint="One reading + one artifact each" />
          <Stat numeral="100+" label="Quiz items" hint="Distractor-rationaled MCQs" />
          <Stat numeral="4" label="Career gates" hint="Foundations → Capstone" />
          <Stat numeral="1" label="Portfolio" hint="A real one. Reviewable." />
        </div>
      </section>

      {/* Pillars */}
      <section className="mx-auto max-w-6xl px-6 py-16 lg:py-24">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="kicker">What you actually learn</div>
            <h2 className="display-title mt-2 text-3xl">Five pillars, twenty-five modules.</h2>
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          <Pillar code="01" name="The role" detail="Identity & orientation" />
          <Pillar code="02" name="The map" detail="Concepts & vocabulary" />
          <Pillar code="03" name="The artifacts" detail="Daily craft" />
          <Pillar code="04" name="Judgment" detail="Career-defining calls" />
          <Pillar code="05" name="The professional" detail="Career & path forward" />
        </div>
      </section>

      {/* Why it works */}
      <section className="border-y border-rule bg-[hsl(var(--secondary))]">
        <div className="mx-auto grid max-w-6xl gap-5 px-6 py-16 sm:grid-cols-3">
          <Feature
            icon={<FileCheck2 className="size-5" />}
            title="Real artifacts, really graded"
            detail="Upload the same memos, WBS diagrams, and status reports a working coordinator ships — an AI grader scores them against a calibrated rubric, every time."
          />
          <Feature
            icon={<CheckCircle2 className="size-5" />}
            title="Four gates to hire-ready"
            detail="Foundations, portfolio, mock interviews, and an industry capstone — each gate proves a different kind of readiness, not just lesson completion."
          />
          <Feature
            icon={<GraduationCap className="size-5" />}
            title="A portfolio you can show"
            detail="Every graded artifact rolls up into a portfolio built for the interview table, not a certificate that sits in an inbox."
          />
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="hero-warm flex flex-wrap items-center justify-between gap-6 rounded-[24px] px-8 py-10 sm:px-12">
          <div>
            <div className="kicker text-[#99F6E4]">Ready to enrol?</div>
            <h2 className="display-title mt-2 text-2xl text-white sm:text-3xl">
              Twenty-five modules. One outcome.
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="white" size="lg">
              <Link href="/signup">Begin the programme</Link>
            </Button>
            <Link href="/login" className="text-sm font-bold text-white/85 hover:text-white">
              Sign in →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-6">
          <span className="text-sm font-semibold text-muted-foreground">Launchpad</span>
          <span className="text-sm text-muted-foreground">A working PM&apos;s guide · 2026</span>
        </div>
      </footer>
    </main>
  );
}

function DefRow({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="text-sm text-muted-foreground">{term}</dt>
      <dd className="font-display text-sm font-bold text-ink">{value}</dd>
    </div>
  );
}

function Stat({ numeral, label, hint }: { numeral: string; label: string; hint: string }) {
  return (
    <div className="rounded-2xl bg-card px-5 py-6 shadow-sm">
      <div className="data-numeral text-[2.2rem] leading-none text-[hsl(var(--accent))]">
        {numeral}
      </div>
      <div className="mt-2 text-sm font-bold text-ink">{label}</div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}

function Pillar({ code, name, detail }: { code: string; name: string; detail: string }) {
  return (
    <div className="tile p-6">
      <span className="flex size-9 items-center justify-center rounded-full bg-[hsl(var(--secondary))] font-display text-sm font-bold text-[hsl(var(--accent))]">
        {code}
      </span>
      <div className="mt-4 font-display text-lg font-bold text-ink">{name}</div>
      <div className="mt-1 text-sm text-muted-foreground">{detail}</div>
    </div>
  );
}

function Feature({
  icon,
  title,
  detail,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl bg-card p-6 shadow-sm">
      <span className="flex size-10 items-center justify-center rounded-full bg-[hsl(var(--secondary))] text-[hsl(var(--accent))]">
        {icon}
      </span>
      <h3 className="mt-4 font-display text-base font-bold text-ink">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{detail}</p>
    </div>
  );
}
