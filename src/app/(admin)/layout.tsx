import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { requireAdmin } from "@/lib/auth/require-user";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between p-4">
          <Link href="/audit" className="font-semibold">
            Launchpad — Admin
          </Link>
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 p-4">{children}</main>
    </div>
  );
}
