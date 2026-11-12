/**
 * Weekly email unsubscribe — against the real database.
 *
 * A signed link switches off the weekly email for the learner it was issued
 * to, and for no one else. The fake db in the unit tests cannot check the
 * WHERE clause, so ownership is proven here.
 *
 * Runs only when TEST_DATABASE_URL points at a local replica
 * (tests/db/build-replica.sh). No email is sent.
 */
import { randomUUID } from "node:crypto";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { profiles, usersInAuth } from "@/db/schema";
import { createUnsubscribeToken, unsubscribeWeeklyDigest } from "@/lib/email/unsubscribe";

const DB_AVAILABLE = !!process.env.TEST_DATABASE_URL;

describe.skipIf(!DB_AVAILABLE)("weekly email unsubscribe", () => {
  const alice = randomUUID();
  const bob = randomUUID();

  async function profile(id: string) {
    const [row] = await db
      .select({
        optIn: profiles.weeklyDigestOptIn,
        hasAccess: profiles.hasAccess,
        fullName: profiles.fullName,
      })
      .from(profiles)
      .where(eq(profiles.id, id));
    return row;
  }

  beforeAll(async () => {
    await db.insert(usersInAuth).values([
      { id: alice, email: `test-unsub-${alice}@launchpad.test` },
      { id: bob, email: `test-unsub-${bob}@launchpad.test` },
    ]);
  });

  afterAll(async () => {
    await db.delete(usersInAuth).where(inArray(usersInAuth.id, [alice, bob]));
  });

  it("new accounts are subscribed to the weekly email", async () => {
    expect((await profile(alice)).optIn).toBe(true);
    expect((await profile(bob)).optIn).toBe(true);
  });

  it("a forged or malformed token changes nothing", async () => {
    const [idPart] = createUnsubscribeToken(alice).split(".");

    expect(
      await unsubscribeWeeklyDigest(`${idPart}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`)
    ).toBe("invalid");
    expect(await unsubscribeWeeklyDigest("nonsense")).toBe("invalid");
    expect((await profile(alice)).optIn).toBe(true);
  });

  it("the learner's own link unsubscribes them, and only them", async () => {
    const before = await profile(alice);

    expect(await unsubscribeWeeklyDigest(createUnsubscribeToken(alice))).toBe("unsubscribed");

    expect(await profile(alice)).toEqual({ ...before, optIn: false });
    expect((await profile(bob)).optIn).toBe(true);
  });

  it("using the link again is harmless", async () => {
    expect(await unsubscribeWeeklyDigest(createUnsubscribeToken(alice))).toBe("unsubscribed");
    expect((await profile(alice)).optIn).toBe(false);
  });

  it("a link for an account that no longer exists is reported as invalid", async () => {
    expect(await unsubscribeWeeklyDigest(createUnsubscribeToken(randomUUID()))).toBe("invalid");
  });
});
