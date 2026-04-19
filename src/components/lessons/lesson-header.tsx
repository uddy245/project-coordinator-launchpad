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
  return (
    <header className="space-y-2">
      <nav className="text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground">
          Dashboard
        </Link>
        <span className="mx-2">→</span>
        <span>Lesson {number}</span>
      </nav>
      <div className="flex items-baseline gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Lesson {number}
          {estimatedMinutes ? ` · ${estimatedMinutes} min` : null}
        </p>
      </div>
      <h1 className="text-3xl font-bold">{title}</h1>
    </header>
  );
}
