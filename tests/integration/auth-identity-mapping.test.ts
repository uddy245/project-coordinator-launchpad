/**
 * Neon Auth → app user mapping (src/lib/auth/session.ts).
 *
 * Existing learners keep their auth.users id (linked by email); brand-new
 * users get auth.users + profiles rows (replacing the on_auth_user_created
 * trigger); unverified emails are never linked — otherwise registering a
 * learner's address with Neon Auth would inherit their data.
 *
 * Runs against the local replica (TEST_DATABASE_URL). Neon Auth itself is
 * mocked: only its session payload matters here.
 */
import { randomUUID } from "node:crypto";
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";

type FakeSessionUser = { id: string; email: string; name: string; emailVerified: boolean };
const auth = vi.hoisted(() => ({ user: null as FakeSessionUser | null }));
const cookieJar = vi.hoisted(() => new Map<string, string>());

vi.mock("@/lib/auth/neon", () => ({
  neonAuth: () => ({
    getSession: async () => ({
      data: auth.user ? { user: auth.user, session: {} } : null,
      error: null,
    }),
  }),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (cookieJar.has(name) ? { value: cookieJar.get(name) } : undefined),
  }),
}));

const DB_AVAILABLE = !!process.env.TEST_DATABASE_URL;

describe.skipIf(!DB_AVAILABLE)("auth identity mapping", async () => {
  const { db } = await import("@/db");
  const { profiles, usersInAuth } = await import("@/db/schema");
  const { getSessionState, appUserIdFor } = await import("@/lib/auth/session");

  const legacyId = randomUUID();
  const legacyEmail = `legacy-${legacyId}@launchpad.test`;
  const createdIds: string[] = [legacyId];

  beforeAll(async () => {
    await db.insert(usersInAuth).values({ id: legacyId, email: legacyEmail });
    // The live on_auth_user_created trigger has already created the profile.
    await db
      .insert(profiles)
      .values({ id: legacyId, email: legacyEmail, fullName: "Legacy" })
      .onConflictDoUpdate({ target: profiles.id, set: { fullName: "Legacy" } });
  });

  afterAll(async () => {
    await db.delete(usersInAuth).where(inArray(usersInAuth.id, createdIds));
  });

  beforeEach(() => {
    auth.user = null;
    cookieJar.clear();
  });

  it("signed out without a Neon Auth session", async () => {
    expect(await getSessionState()).toEqual({ status: "signed_out" });
  });

  it("does NOT link an unverified session to an existing learner", async () => {
    auth.user = { id: randomUUID(), email: legacyEmail, name: "x", emailVerified: false };
    expect(await getSessionState()).toEqual({ status: "unverified", email: legacyEmail });
  });

  it("links a verified session to the existing auth.users id by email (case-insensitive)", async () => {
    auth.user = {
      id: randomUUID(),
      email: legacyEmail.toUpperCase(),
      name: "Legacy",
      emailVerified: true,
    };
    const state = await getSessionState();
    expect(state.status).toBe("signed_in");
    if (state.status === "signed_in") expect(state.user.id).toBe(legacyId);
  });

  it("provisions auth.users + profiles for a brand-new verified user (sign-up hook)", async () => {
    const neonId = randomUUID();
    const email = `new-${neonId}@launchpad.test`;
    auth.user = { id: neonId, email, name: "New Learner", emailVerified: true };
    cookieJar.set("lp_signup_source", "preview-coordinator-role");

    const state = await getSessionState();
    expect(state.status).toBe("signed_in");
    const id = appUserIdFor(neonId);
    createdIds.push(id);
    if (state.status === "signed_in") expect(state.user.id).toBe(id);

    const [profile] = await db.select().from(profiles).where(eq(profiles.id, id));
    expect(profile).toMatchObject({
      email,
      fullName: "New Learner",
      role: "learner",
      // Neon/prod default: profiles.has_access defaults to TRUE.
      hasAccess: true,
      signupSource: "preview-coordinator-role",
    });

    // Idempotent: a second resolution reuses the same rows.
    expect(await getSessionState()).toEqual(state);
  });

  it("derives a stable UUID for non-UUID Neon Auth ids", () => {
    const a = appUserIdFor("abc123");
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(appUserIdFor("abc123")).toBe(a);
  });
});
