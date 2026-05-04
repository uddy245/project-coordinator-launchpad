import Link from "next/link";

export function LessonHeader({
  number,
  title,
  estimatedMinutes,
}: {
  number: number;
  title: string;
  estimatedMinutes: number | null;
}) {
  const moduleCode = `M${String(number).padStart(2, "0")}`;
  return (
    <header className="space-y-4 border-b border-rule pb-6">
      {/* Programme breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-3">
        <Link href="/dashboard" className="mono-link">
          Programme
        </Link>
        <span className="kicker text-rule" aria-hidden>
          /
        </span>
        <span className="kicker">Module {String(number).padStart(2, "0")}</span>
      </nav>

      {/* Module code + meta strip */}
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex items-baseline gap-4">
          <span className="data-numeral text-[1.8rem] leading-none text-[hsl(var(--accent))]">
            {moduleCode}
          </span>
          <span className="h-3 w-px bg-rule" aria-hidden />
          <span className="kicker">Project Coordinator Launchpad</span>
        </div>
        {estimatedMinutes ? <span className="kicker">Est. {estimatedMinutes} min</span> : null}
      </div>

      {/* Title */}
      <h1 className="display-title text-[2rem] sm:text-[2.4rem] lg:text-[2.8rem]">{title}</h1>
    </header>
  );
}
