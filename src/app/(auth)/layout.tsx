import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Left — institutional card with programme info */}
      <aside className="hero-warm hidden flex-col justify-between p-12 lg:flex">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-xl font-semibold leading-none text-white">
            Launchpad
          </span>
          <span className="h-3 w-px bg-white/25" aria-hidden />
          <span className="kicker !text-[#99F6E4]">PROG·PC·25</span>
        </div>

        <div className="space-y-8">
          <div>
            <span className="kicker !text-[#99F6E4]">Project Coordinator Launchpad</span>
            <h2 className="display-title mt-2 text-3xl text-white">
              The career programme for the under-taught role.
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/15 bg-white/15">
            <div className="bg-white/[0.06] px-5 py-4">
              <div className="kicker !text-[#99F6E4]">Modules</div>
              <div className="data-numeral mt-1 text-[1.6rem] leading-none text-white">25</div>
            </div>
            <div className="bg-white/[0.06] px-5 py-4">
              <div className="kicker !text-[#99F6E4]">Outcome</div>
              <div className="mt-1 text-base font-medium text-white">Hire-ready PC</div>
            </div>
            <div className="bg-white/[0.06] px-5 py-4">
              <div className="kicker !text-[#99F6E4]">Format</div>
              <div className="mt-1 text-base font-medium text-white">Self-paced</div>
            </div>
            <div className="bg-white/[0.06] px-5 py-4">
              <div className="kicker !text-[#99F6E4]">Workload</div>
              <div className="mt-1 text-base font-medium text-white">~50 min / module</div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-white/15 pt-5">
          <span className="kicker !text-[#99F6E4]">Cohort · Rolling</span>
          <Link href="/" className="mono-link !text-white/85 hover:!text-white">
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
          <div className="rounded-lg border border-rule bg-card p-8 shadow-sm sm:p-10">
            {children}
          </div>
        </div>
      </section>
    </div>
  );
}
