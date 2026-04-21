"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const TABS = [
  { key: "video", label: "Video" },
  { key: "read", label: "Read" },
  { key: "workbook", label: "Workbook" },
  { key: "quiz", label: "Quiz" },
] as const;

export type LessonTabKey = (typeof TABS)[number]["key"];

export function LessonTabs({ active }: { active: LessonTabKey }) {
  const pathname = usePathname();
  const params = useSearchParams();

  function hrefFor(tab: LessonTabKey): string {
    const sp = new URLSearchParams(params);
    sp.set("tab", tab);
    return `${pathname}?${sp.toString()}`;
  }

  return (
    <nav className="border-b" aria-label="Lesson sections">
      <ul className="-mb-px flex gap-6">
        {TABS.map((t) => {
          const isActive = t.key === active;
          return (
            <li key={t.key}>
              <Link
                href={hrefFor(t.key)}
                scroll={false}
                className={
                  "inline-flex border-b-2 px-1 py-3 text-sm font-medium transition-colors " +
                  (isActive
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground")
                }
                aria-current={isActive ? "page" : undefined}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
