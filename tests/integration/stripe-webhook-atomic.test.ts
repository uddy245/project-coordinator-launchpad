/**
 * Stripe webhook — a recorded purchase always comes with access.
 *
 * Guards the fix for "paid but locked out": the handler used to insert the
 * purchases row, then grant access as a separate step. If the grant failed
 * once, Stripe's retry found the purchase, treated the delivery as a
 * duplicate and never granted access. Both writes are now one transaction.
 *
 * Runs only when TEST_DATABASE_URL points at a local replica
 * (tests/db/build-replica.sh). No Stripe or email calls are made.
 */
import { randomUUID } from "node:crypto";
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { eq, inArray } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "@/db";
import { profiles, purchases, usersInAuth } from "@/db/schema";

vi.mock("@/lib/email/send", () => ({ sendEmail: vi.fn(async () => undefined) }));
vi.mock("@/lib/stripe/client", () => ({
  stripe: { paymentIntents: { retrieve: vi.fn(async () => ({ latest_charge: null })) } },
}));

// The price/amount check is unit-tested in stripe-verify-purchase.test.ts.
vi.mock("@/lib/stripe/verify-purchase", () => ({
  verifyCoursePurchase: vi.fn(async () => ({ ok: true })),
}));

import { handleCheckoutSessionCompleted } from "@/lib/stripe/webhook";

const DB_AVAILABLE = !!process.env.TEST_DATABASE_URL;

describe.skipIf(!DB_AVAILABLE)("stripe webhook: purchase and access are atomic", () => {
  const userId = randomUUID();
  const otherUserId = randomUUID();
  const email = `test-webhook-${userId}@launchpad.test`;

  function session(id: string, overrides: Partial<Stripe.Checkout.Session> = {}) {
    return {
      id,
      payment_status: "paid",
      payment_intent: `pi_${id}`,
      amount_total: 74900,
      currency: "usd",
      metadata: { user_id: userId },
      client_reference_id: userId,
      customer_email: email,
      ...overrides,
    } as Stripe.Checkout.Session;
  }

  async function hasAccess(id: string): Promise<boolean | undefined> {
    const [row] = await db
      .select({ hasAccess: profiles.hasAccess })
      .from(profiles)
      .where(eq(profiles.id, id))
      .limit(1);
    return row?.hasAccess;
  }

  async function purchaseCount(id: string): Promise<number> {
    const rows = await db
      .select({ id: purchases.id })
      .from(purchases)
      .where(eq(purchases.userId, id));
    return rows.length;
  }

  beforeAll(async () => {
    // The on_auth_user_created trigger creates each profile row.
    await db.insert(usersInAuth).values([
      { id: userId, email },
      { id: otherUserId, email: `test-webhook-${otherUserId}@launchpad.test` },
    ]);
    // Both start unpaid, whatever profiles.has_access defaults to.
    await db
      .update(profiles)
      .set({ hasAccess: false })
      .where(inArray(profiles.id, [userId, otherUserId]));
  });

  afterAll(async () => {
    // Cascades profiles, purchases and gate_status.
    await db.delete(usersInAuth).where(eq(usersInAuth.id, userId));
    await db.delete(usersInAuth).where(eq(usersInAuth.id, otherUserId));
  });

  it("starts with two profiles that have no access", async () => {
    expect(await hasAccess(userId)).toBe(false);
    expect(await hasAccess(otherUserId)).toBe(false);
  });

  it("rolls the purchase back when access cannot be granted, so the retry succeeds", async () => {
    const sessionId = `cs_test_${randomUUID().replaceAll("-", "")}`;

    // First delivery: the grant fails (no profile row to update).
    await db.delete(profiles).where(eq(profiles.id, userId));
    await expect(handleCheckoutSessionCompleted(session(sessionId))).rejects.toThrow(
      /no profile row/
    );
    expect(await purchaseCount(userId)).toBe(0);

    // The cause is fixed; Stripe retries the same event.
    await db.insert(profiles).values({ id: userId, email, hasAccess: false });
    const retry = await handleCheckoutSessionCompleted(session(sessionId));

    expect(retry).toEqual({ granted: true });
    expect(await hasAccess(userId)).toBe(true);
    expect(await purchaseCount(userId)).toBe(1);
  });

  it("does not grant again on a duplicate delivery, even after access was removed", async () => {
    const sessionId = `cs_test_${randomUUID().replaceAll("-", "")}`;
    await handleCheckoutSessionCompleted(session(sessionId));
    const before = await purchaseCount(userId);

    // Access removed afterwards (for example, a refund handled by an admin).
    await db.update(profiles).set({ hasAccess: false }).where(eq(profiles.id, userId));
    const duplicate = await handleCheckoutSessionCompleted(session(sessionId));

    expect(duplicate).toMatchObject({ granted: false });
    expect(await hasAccess(userId)).toBe(false);
    expect(await purchaseCount(userId)).toBe(before);
  });

  it("delayed payment: nothing is recorded while unpaid, access is granted when it clears", async () => {
    const sessionId = `cs_test_${randomUUID().replaceAll("-", "")}`;
    await db.update(profiles).set({ hasAccess: false }).where(eq(profiles.id, userId));
    const before = await purchaseCount(userId);

    // checkout.session.completed for a bank debit: not paid yet.
    const pending = await handleCheckoutSessionCompleted(
      session(sessionId, { payment_status: "unpaid" })
    );
    expect(pending).toMatchObject({ granted: false });
    expect(await hasAccess(userId)).toBe(false);
    expect(await purchaseCount(userId)).toBe(before);

    // checkout.session.async_payment_succeeded for the same session, days later.
    const cleared = await handleCheckoutSessionCompleted(session(sessionId));
    expect(cleared).toEqual({ granted: true });
    expect(await hasAccess(userId)).toBe(true);
    expect(await purchaseCount(userId)).toBe(before + 1);
  });

  it("grants access only to the user named in the session", async () => {
    const sessionId = `cs_test_${randomUUID().replaceAll("-", "")}`;

    await handleCheckoutSessionCompleted(session(sessionId));

    expect(await hasAccess(userId)).toBe(true);
    expect(await hasAccess(otherUserId)).toBe(false);
    expect(await purchaseCount(otherUserId)).toBe(0);
  });
});
