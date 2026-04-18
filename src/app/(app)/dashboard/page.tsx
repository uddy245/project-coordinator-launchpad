import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { PurchaseCTA } from "@/components/marketing/purchase-cta";

export const metadata = { title: "Dashboard — Launchpad" };

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("has_access, full_name")
    .eq("id", user.id)
    .single();

  const hasAccess = profile?.has_access ?? false;
  const greetingName = profile?.full_name || user.email;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome, {greetingName}.</p>
      </div>

      {hasAccess ? (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Your lessons</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Lesson content arrives in M3. You&apos;re on the list.
          </p>
        </div>
      ) : (
        <PurchaseCTA />
      )}
    </div>
  );
}
