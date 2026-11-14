/**
 * New accounts start without paid access.
 *
 * Guards db/migrations/20261112_01_profiles_has_access_default_false.sql.
 * profiles.has_access had drifted to DEFAULT true, so every sign-up got the
 * whole program, never saw the purchase button, and could not have paid:
 * createCheckoutSession() refuses users who already have access.
 *
 * Runs only when TEST_DATABASE_URL points at a local replica
 * (tests/db/build-replica.sh), which applies db/migrations on top of the
 * schema copied from Neon.
 */
import { randomUUID } from "node:crypto";
import { describe, it, expect, afterAll, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";

// Neon Auth is not involved: provisionAppUser only writes to the database.
vi.mock("@/lib/auth/neon", () => ({
  neonAuth: () => ({ getSession: async () => ({ data: null }) }),
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));

import { db } from "@/db";
import { profiles, usersInAuth } from "@/db/schema";
import { provisionAppUser } from "@/lib/auth/session";
import { canViewLesson } from "@/lib/lessons/access";

const DB_AVAILABLE = !!process.env.TEST_DATABASE_URL;

describe.skipIf(!DB_AVAILABLE)("new accounts start without paid access", () => {
  const created: string[] = [];

  async function hasAccess(id: string): Promise<boolean | undefined> {
    const [row] = await db
      .select({ hasAccess: profiles.hasAccess })
      .from(profiles)
      .where(eq(profiles.id, id))
      .limit(1);
    return row?.hasAccess;
  }

  afterAll(async () => {
    if (created.length) await db.delete(usersInAuth).where(inArray(usersInAuth.id, created));
  });

  it("the sign-up hook creates a profile with has_access = false", async () => {
    const id = await provisionAppUser({
      neonUserId: randomUUID(),
      email: `test-default-${randomUUID()}@launchpad.test`,
      fullName: "New Learner",
      signupSource: null,
    });
    created.push(id);

    expect(await hasAccess(id)).toBe(false);
  });

  it("the database trigger alone creates a profile with has_access = false", async () => {
    const id = randomUUID();
    created.push(id);
    await db.insert(usersInAuth).values({ id, email: `test-default-${id}@launchpad.test` });

    expect(await hasAccess(id)).toBe(false);
  });

  it("a new account can open a free preview lesson but not a paid one", async () => {
    const id = randomUUID();
    created.push(id);
    await db.insert(usersInAuth).values({ id, email: `test-default-${id}@launchpad.test` });

    expect(await canViewLesson(id, { isPublished: true, isPreview: true })).toBe(true);
    expect(await canViewLesson(id, { isPublished: true, isPreview: false })).toBe(false);
  });

  it("an account that is given access keeps it (the default does not touch existing rows)", async () => {
    const id = randomUUID();
    created.push(id);
    await db.insert(usersInAuth).values({ id, email: `test-default-${id}@launchpad.test` });
    await db.update(profiles).set({ hasAccess: true }).where(eq(profiles.id, id));

    expect(await canViewLesson(id, { isPublished: true, isPreview: false })).toBe(true);
  });
});
