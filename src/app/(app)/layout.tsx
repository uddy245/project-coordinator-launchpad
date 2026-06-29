import Link from "next/link";
import { PrimaryNav } from "@/components/nav/primary-nav";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();

  // Only render the Admin link in the primary nav for admin users. The
  // /admin routes already gate themselves server-side; this is just so
  // ordinary learners don't see a link they can't use.
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="relative border-b border-rule bg-paper">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/dashboard" className="flex items-baseline gap-3">
            <span className="font-display text-xl font-semibold leading-none text-ink">
              Launchpad
            </span>
            <span className="hidden h-3 w-px bg-rule sm:block" aria-hidden />
            <span className="kicker hidden sm:inline-block">PROG·PC·25</span>
          </Link>
          <PrimaryNav isAdmin={!!isAdmin} />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">{children}</main>
      <footer className="border-t border-rule bg-paper">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <span className="kicker">Launchpad · 2026</span>
          <span className="kicker">PROG·PC·25 · A working PM&apos;s guide</span>
        </div>
      </footer>
    </div>
  );
}
