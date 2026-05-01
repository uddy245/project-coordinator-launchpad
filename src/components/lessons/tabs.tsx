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
    <nav className="border-b border-rule" aria-label="Lesson sections">
      <ul className="-mb-px flex gap-10">
        {TABS.map((t) => {
          const isActive = t.key === active;
          return (
            <li key={t.key}>
              <Link
                href={hrefFor(t.key)}
                scroll={false}
                className={
                  "mono-link inline-flex border-b-[2px] px-1 py-4 transition-colors " +
                  (isActive
                    ? "border-[hsl(var(--accent))] text-ink"
                    : "border-transparent hover:border-rule")
                }
                data-active={isActive ? "true" : "false"}
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
