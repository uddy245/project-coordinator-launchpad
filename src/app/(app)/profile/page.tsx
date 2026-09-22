import { requireUser } from "@/lib/auth/require-user";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { ProfileForm } from "@/components/auth/profile-form";

export const metadata = { title: "Profile — Launchpad" };

export default async function ProfilePage() {
  const user = await requireUser();

  // profiles: own row only.
  const [profile] = await db
    .select({ full_name: profiles.fullName })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  return (
    <div className="max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Update your display name. Email is not editable.
        </p>
      </div>
      <ProfileForm email={user.email ?? ""} initialFullName={profile?.full_name ?? ""} />
    </div>
  );
}
