"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { getAppUser } from "@/lib/auth/session";

/**
 * Read the authenticated user's has_access. Used by the checkout-success
 * page to poll for the webhook having flipped the flag.
 */
export async function getMyAccess(): Promise<{ hasAccess: boolean }> {
  const user = await getAppUser();
  if (!user) return { hasAccess: false };

  try {
    // Owner-only: the caller's own profile row.
    const [row] = await db
      .select({ has_access: profiles.hasAccess })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);
    return { hasAccess: !!row?.has_access };
  } catch {
    return { hasAccess: false };
  }
}
