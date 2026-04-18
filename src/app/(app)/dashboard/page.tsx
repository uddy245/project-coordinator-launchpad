import { requireUser } from "@/lib/auth/require-user";

export const metadata = { title: "Dashboard — Launchpad" };

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-muted-foreground">Signed in as {user.email}.</p>
    </div>
  );
}
