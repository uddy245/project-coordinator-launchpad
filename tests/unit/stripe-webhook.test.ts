import { describe, it, expect, vi, beforeEach } from "vitest";
import type Stripe from "stripe";

const { insertMock, updateEqMock, fromMock } = vi.hoisted(() => {
  const insertMock = vi.fn();
  const updateEqMock = vi.fn();
  const fromMock = vi.fn();
  return { insertMock, updateEqMock, fromMock };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: fromMock }),
}));

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

beforeEach(() => {
  insertMock.mockReset();
  updateEqMock.mockReset();
  fromMock.mockReset();

  fromMock.mockImplementation((table: string) => {
    if (table === "purchases") return { insert: insertMock };
    if (table === "profiles") return { update: () => ({ eq: updateEqMock }) };
    throw new Error("unexpected table: " + table);
  });
});

describe("handleCheckoutSessionCompleted", () => {
  it("happy path: inserts a purchase and flips has_access", async () => {
    insertMock.mockResolvedValue({ error: null });
    updateEqMock.mockResolvedValue({ error: null });

    const result = await handleCheckoutSessionCompleted(buildSession());

    expect(result).toEqual({ granted: true });
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "u1",
        stripe_session_id: "cs_test_1",
        stripe_payment_intent_id: "pi_test_1",
        amount_cents: 74900,
        currency: "usd",
        status: "paid",
      })
    );
    expect(updateEqMock).toHaveBeenCalledWith("id", "u1");
  });

  it("is idempotent: unique-violation on duplicate does not grant again", async () => {
    insertMock.mockResolvedValue({ error: { code: "23505", message: "unique" } });

    const result = await handleCheckoutSessionCompleted(buildSession());

    expect(result).toMatchObject({ granted: false, reason: expect.stringContaining("duplicate") });
    expect(updateEqMock).not.toHaveBeenCalled();
  });

  it("skips sessions without a user_id", async () => {
    const result = await handleCheckoutSessionCompleted(
      buildSession({ metadata: {}, client_reference_id: null })
    );
    expect(result).toMatchObject({ granted: false, reason: "no user_id in metadata" });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("skips sessions with non-paid status", async () => {
    const result = await handleCheckoutSessionCompleted(buildSession({ payment_status: "unpaid" }));
    expect(result).toMatchObject({ granted: false });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("throws on non-idempotent insert errors so Stripe retries", async () => {
    insertMock.mockResolvedValue({ error: { code: "22000", message: "boom" } });
    await expect(handleCheckoutSessionCompleted(buildSession())).rejects.toThrow(/boom/);
  });

  it("throws when the profile update fails", async () => {
    insertMock.mockResolvedValue({ error: null });
    updateEqMock.mockResolvedValue({ error: { message: "rls blocked" } });
    await expect(handleCheckoutSessionCompleted(buildSession())).rejects.toThrow(/rls blocked/);
  });

  it("falls back to client_reference_id when metadata.user_id is missing", async () => {
    insertMock.mockResolvedValue({ error: null });
    updateEqMock.mockResolvedValue({ error: null });
    await handleCheckoutSessionCompleted(buildSession({ metadata: {} }));
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ user_id: "u1" }));
  });
});
