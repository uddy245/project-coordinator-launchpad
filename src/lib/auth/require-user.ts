import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

async function currentPath(): Promise<string> {
  const h = await headers();
  return h.get("x-pathname") ?? "/";
}

/**
 * Require an authenticated user. Redirects to `/login?redirect=<current>`
 * if there is no session. Always returns a user when it returns.
 */
export async function requireUser(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const path = await currentPath();
    redirect(`/login?redirect=${encodeURIComponent(path)}`);
  }

  return user;
}

/**
 * Require an admin user. Redirects unauthenticated users to /login, and
 * returns a 404 for authenticated non-admins (so the existence of the
 * admin area is not revealed).
 */
export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    notFound();
  }
  return user;
}

/**
 * Redirect to /dashboard (or the target) if the user is already authenticated.
 * Used on /login and /signup so signed-in users don't see the auth forms.
 */
export async function redirectIfAuthed(target = "/dashboard"): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect(target);
  }
}
