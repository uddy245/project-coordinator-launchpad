"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Read the authenticated user's has_access. Used by the checkout-success
 * page to poll for the webhook having flipped the flag.
 */
export async function getMyAccess(): Promise<{ hasAccess: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { hasAccess: false };

  const { data } = await supabase.from("profiles").select("has_access").eq("id", user.id).single();

  return { hasAccess: !!data?.has_access };
}
