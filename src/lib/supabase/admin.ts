import { createClient } from "@supabase/supabase-js";
import { env } from "@/env";

/**
 * Service-role Supabase client. Bypasses RLS. Use ONLY in server-side
 * code that genuinely needs to write on behalf of the system (Stripe
 * webhook, grading edge function, admin tooling). Never import this
 * from a route that a user can reach directly with untrusted input.
 */
export function createAdminClient() {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
