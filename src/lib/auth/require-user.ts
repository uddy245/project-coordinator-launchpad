import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { getSessionState, isAdmin, type AppUser } from "@/lib/auth/session";

async function currentPath(): Promise<string> {
  const h = await headers();
  return h.get("x-pathname") ?? "/";
}

/**
 * Require an authenticated user. Redirects to `/login?redirect=<current>`
 * if there is no session, or to `/verify-email` if the email is not yet
 * verified. Always returns a user when it returns.
 */
export async function requireUser(): Promise<AppUser> {
  const state = await getSessionState();

  if (state.status === "unverified") {
    redirect("/verify-email");
  }
  if (state.status !== "signed_in") {
    const path = await currentPath();
    redirect(`/login?redirect=${encodeURIComponent(path)}`);
  }

  return state.user;
}

/**
 * Require an admin user. Redirects unauthenticated users to /login, and
 * returns a 404 for authenticated non-admins (so the existence of the
 * admin area is not revealed).
 */
export async function requireAdmin(): Promise<AppUser> {
  const user = await requireUser();
  if (!(await isAdmin(user.id))) {
    notFound();
  }
  return user;
}

/**
 * Redirect to /dashboard (or the target) if the user is already authenticated.
 * Used on /login and /signup so signed-in users don't see the auth forms.
 */
export async function redirectIfAuthed(target = "/dashboard"): Promise<void> {
  const state = await getSessionState();
  if (state.status === "signed_in") {
    redirect(target);
  }
}
