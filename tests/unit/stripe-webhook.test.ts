import { describe, it, expect, vi, beforeEach } from "vitest";
import type Stripe from "stripe";

const fakeDb = await vi.hoisted(async () => (await import("../helpers/fake-db")).createFakeDb());

vi.mock("@/db", () => ({ db: fakeDb.db }));
vi.mock("@/lib/email/send", () => ({ sendEmail: vi.fn(async () => undefined) }));

import { handleCheckoutSessionCompleted } from "@/lib/stripe/webhook";

function buildSession(overrides: Partial<Stripe.Checkout.Session> = {}): Stripe.Checkout.Session {
  return {
    id: "cs_test_1",
    payment_status: "paid",
    payment_intent: "pi_test_1",
    amount_total: 74900,
    currency: "usd",
    metadata: { user_id: "u1" },
    client_reference_id: "u1",
    ...overrides,
  } as Stripe.Checkout.Session;
}

/**
 * purchases insert…onConflictDoNothing…returning → `inserted` (an empty
 * array means the conflict fired, i.e. duplicate delivery);
 * profiles update → `update`.
 */
function withDb(inserted: unknown = [{ id: "p1" }], update: unknown = []) {
  fakeDb.reset((q) => {
    if (q.op === "insert" && q.table === "purchases") return inserted;
    if (q.op === "update" && q.table === "profiles") return update;
    return [];
  });
}

beforeEach(() => {
  withDb();
});

describe("handleCheckoutSessionCompleted", () => {
  it("happy path: inserts a purchase and flips has_access", async () => {
    const result = await handleCheckoutSessionCompleted(buildSession());

    expect(result).toEqual({ granted: true });
    const [insert] = fakeDb.callsFor("insert", "purchases");
    expect(insert.values).toEqual({
      userId: "u1",
      stripeSessionId: "cs_test_1",
      stripePaymentIntentId: "pi_test_1",
      amountCents: 74900,
      currency: "usd",
      status: "paid",
    });
    expect(insert.chain).toContain("onConflictDoNothing");
    const updates = fakeDb.callsFor("update", "profiles");
    expect(updates).toHaveLength(1);
    expect(updates[0].set).toEqual({ hasAccess: true });
  });

  it("is idempotent: a duplicate session (no row returned) does not grant again", async () => {
    withDb([]);

    const result = await handleCheckoutSessionCompleted(buildSession());

    expect(result).toMatchObject({ granted: false, reason: expect.stringContaining("duplicate") });
    expect(fakeDb.callsFor("update", "profiles")).toHaveLength(0);
  });

  it("skips sessions without a user_id", async () => {
    const result = await handleCheckoutSessionCompleted(
      buildSession({ metadata: {}, client_reference_id: null })
    );
    expect(result).toMatchObject({ granted: false, reason: "no user_id in metadata" });
    expect(fakeDb.calls).toHaveLength(0);
  });

  it("skips sessions with non-paid status", async () => {
    const result = await handleCheckoutSessionCompleted(buildSession({ payment_status: "unpaid" }));
    expect(result).toMatchObject({ granted: false });
    expect(fakeDb.calls).toHaveLength(0);
  });

  it("throws on insert errors so Stripe retries", async () => {
    withDb(new Error("boom"));
    await expect(handleCheckoutSessionCompleted(buildSession())).rejects.toThrow(/boom/);
    expect(fakeDb.callsFor("update", "profiles")).toHaveLength(0);
  });

  it("throws when the profile update fails", async () => {
    withDb([{ id: "p1" }], new Error("connection lost"));
    await expect(handleCheckoutSessionCompleted(buildSession())).rejects.toThrow(/connection lost/);
  });

  it("falls back to client_reference_id when metadata.user_id is missing", async () => {
    await handleCheckoutSessionCompleted(buildSession({ metadata: {} }));
    expect(fakeDb.callsFor("insert", "purchases")[0].values).toMatchObject({ userId: "u1" });
  });
});
