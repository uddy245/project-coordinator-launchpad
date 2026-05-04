import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Left — institutional card with programme info */}
      <aside className="hidden flex-col justify-between border-r border-rule bg-paper p-12 lg:flex">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-xl font-semibold leading-none text-ink">
            Launchpad
          </span>
          <span className="h-3 w-px bg-rule" aria-hidden />
          <span className="kicker">PROG·PC·25</span>
        </div>

        <div className="space-y-8">
          <div>
            <span className="kicker">Project Coordinator Launchpad</span>
            <h2 className="display-title mt-2 text-3xl">
              The career programme for the under-taught role.
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-px border border-rule bg-rule">
            <div className="bg-paper px-5 py-4">
              <div className="kicker">Modules</div>
              <div className="data-numeral mt-1 text-[1.6rem] leading-none text-ink">25</div>
            </div>
            <div className="bg-paper px-5 py-4">
              <div className="kicker">Outcome</div>
              <div className="mt-1 text-base font-medium text-ink">Hire-ready PC</div>
            </div>
            <div className="bg-paper px-5 py-4">
              <div className="kicker">Format</div>
              <div className="mt-1 text-base font-medium text-ink">Self-paced</div>
            </div>
            <div className="bg-paper px-5 py-4">
              <div className="kicker">Workload</div>
              <div className="mt-1 text-base font-medium text-ink">~50 min / module</div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-rule pt-5">
          <span className="kicker">Cohort · Rolling</span>
          <Link href="/" className="mono-link">
            ← Programme overview
          </Link>
        </div>
      </aside>

      {/* Right — form */}
      <section className="flex items-center justify-center bg-background p-6 lg:p-12">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-8 inline-flex items-baseline gap-3 lg:hidden">
            <span className="font-display text-lg font-semibold leading-none text-ink">
              Launchpad
            </span>
            <span className="kicker">PROG·PC·25</span>
          </Link>
          <div className="border border-rule bg-card p-8 sm:p-10">{children}</div>
        </div>
      </section>
    </div>
  );
}
