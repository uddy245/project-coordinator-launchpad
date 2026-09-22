import "server-only";
import { createHash } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { profiles, usersInAuth } from "@/db/schema";
import { neonAuth } from "./neon";

/**
 * The authenticated user as the app sees it.
 *
 * `id` is the `auth.users.id` that every public table references — NOT the
 * Neon Auth user id. Existing (pre-migration) users are linked to their
 * original `auth.users` row by email so their profile/progress stay attached.
 */
export type AppUser = {
  id: string;
  email: string;
  name: string | null;
  neonAuthUserId: string;
};

type NeonSessionUser = {
  id: string;
  email: string;
  name?: string | null;
  emailVerified: boolean;
};

export type SessionState =
  | { status: "signed_out" }
  | { status: "unverified"; email: string }
  | { status: "signed_in"; user: AppUser };

/** Cookie the sign-up action sets so the profile row can record attribution. */
export const SIGNUP_SOURCE_COOKIE = "lp_signup_source";

/**
 * Current Neon Auth session user, or null. Never throws: a failed upstream
 * call (or a cookie write attempted from a Server Component) is treated as
 * signed out.
 */
export const getNeonSessionUser = cache(async (): Promise<NeonSessionUser | null> => {
  try {
    const { data } = await neonAuth().getSession();
    const u = data?.user;
    if (!u?.id || !u.email) return null;
    return { id: u.id, email: u.email, name: u.name ?? null, emailVerified: !!u.emailVerified };
  } catch (err) {
    console.warn("[auth] getSession failed", err);
    return null;
  }
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * App user id for a brand-new Neon Auth user. Reuses the Neon Auth id when it
 * is a UUID; otherwise derives a stable UUID from it so concurrent first
 * requests all compute the same id.
 */
export function appUserIdFor(neonUserId: string): string {
  if (UUID_RE.test(neonUserId)) return neonUserId.toLowerCase();
  const h = createHash("sha256").update(`neon-auth:${neonUserId}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

async function findAuthUserIdByEmail(email: string): Promise<string | null> {
  const [row] = await db
    .select({ id: usersInAuth.id })
    .from(usersInAuth)
    .where(sql`lower(${usersInAuth.email}) = ${email.toLowerCase()} and ${usersInAuth.deletedAt} is null`)
    .orderBy(usersInAuth.createdAt)
    .limit(1);
  return row?.id ?? null;
}

/**
 * Replaces the old `on_auth_user_created` trigger (`handle_new_user()`):
 * creates the `auth.users` row the public tables reference, plus the
 * matching `profiles` row. Idempotent — safe under concurrent first requests.
 */
export async function provisionAppUser(input: {
  neonUserId: string;
  email: string;
  fullName: string | null;
  signupSource: string | null;
}): Promise<string> {
  const id = appUserIdFor(input.neonUserId);
  const email = input.email.toLowerCase();
  const meta: Record<string, string> = {};
  if (input.fullName) meta.full_name = input.fullName;
  if (input.signupSource) meta.signup_source = input.signupSource;

  await db.transaction(async (tx) => {
    const now = new Date().toISOString();
    await tx
      .insert(usersInAuth)
      .values({
        id,
        email,
        aud: "authenticated",
        role: "authenticated",
        emailConfirmedAt: now,
        rawAppMetaData: { provider: "neon_auth" },
        rawUserMetaData: meta,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();
    await tx
      .insert(profiles)
      .values({
        id,
        email,
        fullName: input.fullName,
        signupSource: input.signupSource?.toLowerCase() ?? null,
      })
      .onConflictDoNothing();
  });

  // If another request won a race with a different id (e.g. a legacy row
  // appeared), the email lookup is authoritative.
  return (await findAuthUserIdByEmail(email)) ?? id;
}

async function readSignupSource(): Promise<string | null> {
  try {
    const v = (await cookies()).get(SIGNUP_SOURCE_COOKIE)?.value;
    return v && /^[a-z0-9_-]{1,80}$/.test(v) ? v : null;
  } catch {
    return null;
  }
}

/**
 * Resolve the Neon Auth session to an app user.
 *
 * Security: accounts are linked by email, so the email MUST be verified
 * first — otherwise anyone could register a learner's address with Neon
 * Auth and inherit their data. Unverified sessions are never mapped.
 */
export const getSessionState = cache(async (): Promise<SessionState> => {
  const su = await getNeonSessionUser();
  if (!su) return { status: "signed_out" };
  if (!su.emailVerified) return { status: "unverified", email: su.email };

  let id = await findAuthUserIdByEmail(su.email);
  if (!id) {
    id = await provisionAppUser({
      neonUserId: su.id,
      email: su.email,
      fullName: su.name && su.name !== su.email ? su.name : null,
      signupSource: await readSignupSource(),
    });
  }
  return {
    status: "signed_in",
    user: { id, email: su.email.toLowerCase(), name: su.name ?? null, neonAuthUserId: su.id },
  };
});

/** The signed-in, verified app user — or null. Use in actions/route handlers. */
export async function getAppUser(): Promise<AppUser | null> {
  const state = await getSessionState();
  return state.status === "signed_in" ? state.user : null;
}

/** Code-side replacement for the `public.is_admin()` SQL function. */
export async function isAdmin(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);
  return row?.role === "admin";
}

/** Signed-in user who has purchased access (replaces RLS `has_access` checks). */
export async function hasAccess(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ hasAccess: profiles.hasAccess, role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);
  return !!row && (row.hasAccess || row.role === "admin");
}
