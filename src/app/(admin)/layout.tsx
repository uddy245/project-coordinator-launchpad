import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { requireAdmin } from "@/lib/auth/require-user";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-rule">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/audit" className="flex items-baseline gap-3">
            <span className="font-display text-lg font-semibold leading-none text-ink">
              Launchpad
            </span>
            <span className="hidden h-3 w-px bg-rule sm:block" aria-hidden />
            <span className="kicker hidden sm:inline-block">Admin</span>
          </Link>
          <nav className="flex items-center gap-7" aria-label="Admin">
            <Link href="/audit" className="mono-link">
              Audit
            </Link>
            <Link href="/admin/lessons" className="mono-link">
              Lessons
            </Link>
            <Link href="/admin/scenarios" className="mono-link">
              Scenarios
            </Link>
            <Link href="/admin/capstones" className="mono-link">
              Capstones
            </Link>
            <Link href="/dashboard" className="mono-link">
              ← Back to app
            </Link>
            <SignOutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">{children}</main>
    </div>
  );
}
