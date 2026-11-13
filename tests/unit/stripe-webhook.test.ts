import { describe, it, expect, vi, beforeEach } from "vitest";
import type Stripe from "stripe";

const fakeDb = await vi.hoisted(async () => (await import("../helpers/fake-db")).createFakeDb());

vi.mock("@/db", () => ({ db: fakeDb.db }));
vi.mock("@/lib/email/send", () => ({ sendEmail: vi.fn(async () => undefined) }));
const verify = vi.hoisted(() => vi.fn());
const afterMock = vi.hoisted(() => vi.fn());
vi.mock("next/server", () => ({ after: afterMock }));
vi.mock("@/lib/stripe/verify-purchase", () => ({ verifyCoursePurchase: verify }));

import { sendEmail } from "@/lib/email/send";
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
 * profiles update…returning → `update` (an empty array means no profile row
 * matched). Rollback itself is covered against a real database in
 * tests/integration/stripe-webhook-atomic.test.ts.
 */
function withDb(inserted: unknown = [{ id: "p1" }], update: unknown = [{ id: "u1" }]) {
  fakeDb.reset((q) => {
    if (q.op === "insert" && q.table === "purchases") return inserted;
    if (q.op === "update" && q.table === "profiles") return update;
    return [];
  });
}

beforeEach(() => {
  withDb();
  verify.mockReset().mockResolvedValue({ ok: true });
  afterMock.mockReset();
  vi.mocked(sendEmail).mockClear();
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

  it("checks the session is the course at the course price before granting", async () => {
    await handleCheckoutSessionCompleted(buildSession());
    expect(verify).toHaveBeenCalledWith(buildSession());
  });

  it("grants nothing, logs, and reports rejected for a paid session that is not the course", async () => {
    verify.mockResolvedValue({ ok: false, reason: "price=price_other" });
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const result = await handleCheckoutSessionCompleted(buildSession());

    expect(result).toEqual({ granted: false, reason: "price=price_other", rejected: true });
    expect(fakeDb.calls).toHaveLength(0);
    expect(error).toHaveBeenCalledWith(expect.stringContaining("price=price_other"));
    error.mockRestore();
  });

  it("does not ask Stripe about line items for an unpaid session", async () => {
    await handleCheckoutSessionCompleted(buildSession({ payment_status: "unpaid" }));
    expect(verify).not.toHaveBeenCalled();
  });

  it("throws, granting nothing, when the purchase check cannot reach Stripe", async () => {
    verify.mockRejectedValue(new Error("Stripe is down"));
    await expect(handleCheckoutSessionCompleted(buildSession())).rejects.toThrow(/Stripe is down/);
    expect(fakeDb.calls).toHaveLength(0);
  });

  it("sends the confirmation email with after(), not as a floating promise", async () => {
    const result = await handleCheckoutSessionCompleted(
      buildSession({
        customer_details: { email: "u@x.com" } as Stripe.Checkout.Session.CustomerDetails,
        payment_intent: null,
      })
    );

    expect(result).toEqual({ granted: true });
    expect(afterMock).toHaveBeenCalledTimes(1);
    expect(sendEmail).not.toHaveBeenCalled();

    const callback = afterMock.mock.calls[0][0] as () => Promise<void>;
    await callback();
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: { email: "u@x.com", name: null }, tag: "purchase-confirmed" })
    );
  });

  it("schedules no email for a duplicate delivery or a rejected session", async () => {
    withDb([]);
    await handleCheckoutSessionCompleted(buildSession());

    withDb();
    verify.mockResolvedValue({ ok: false, reason: "mode=subscription" });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await handleCheckoutSessionCompleted(buildSession());

    expect(afterMock).not.toHaveBeenCalled();
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

  it("throws when there is no profile row to grant access on", async () => {
    withDb([{ id: "p1" }], []);
    await expect(handleCheckoutSessionCompleted(buildSession())).rejects.toThrow(
      /no profile row for user u1/
    );
  });

  it("records the purchase and grants access inside one transaction", async () => {
    const transaction = vi.spyOn(fakeDb.db, "transaction");

    await handleCheckoutSessionCompleted(buildSession());

    expect(transaction).toHaveBeenCalledTimes(1);
    transaction.mockRestore();
  });

  it("falls back to client_reference_id when metadata.user_id is missing", async () => {
    await handleCheckoutSessionCompleted(buildSession({ metadata: {} }));
    expect(fakeDb.callsFor("insert", "purchases")[0].values).toMatchObject({ userId: "u1" });
  });
});
