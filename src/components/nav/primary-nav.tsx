"use client";

import Link from "next/link";
import { useState } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";

const LINKS = [
  { href: "/dashboard", label: "Lessons" },
  { href: "/search", label: "Search" },
  { href: "/interviews", label: "Interviews" },
  { href: "/capstone", label: "Capstone" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/profile", label: "Profile" },
];

/**
 * Primary nav. Full link row on >=md; a hamburger-style toggle that opens a
 * stacked menu below md so the seven links never overflow a phone viewport.
 */
export function PrimaryNav({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="mono-link">
            {l.label}
          </Link>
        ))}
        {isAdmin ? (
          <Link href="/admin/lessons" className="mono-link text-[hsl(var(--accent))]">
            Admin
          </Link>
        ) : null}
        <SignOutButton />
      </nav>

      <button
        type="button"
        className="mono-link inline-flex items-center py-1 md:hidden"
        aria-label="Toggle menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Close" : "Menu"}
      </button>

      {open ? (
        <nav
          className="absolute inset-x-0 top-full z-30 border-b border-rule bg-paper shadow-sm md:hidden"
          aria-label="Primary"
        >
          <ul className="mx-auto flex max-w-6xl flex-col px-6 py-1">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="mono-link block py-3" onClick={() => setOpen(false)}>
                  {l.label}
                </Link>
              </li>
            ))}
            {isAdmin ? (
              <li>
                <Link
                  href="/admin/lessons"
                  className="mono-link block py-3 text-[hsl(var(--accent))]"
                  onClick={() => setOpen(false)}
                >
                  Admin
                </Link>
              </li>
            ) : null}
            <li className="border-t border-rule py-3">
              <SignOutButton />
            </li>
          </ul>
        </nav>
      ) : null}
    </>
  );
}
