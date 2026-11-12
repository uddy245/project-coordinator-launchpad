import { describe, it, expect, vi, beforeEach } from "vitest";

const list = vi.hoisted(() => vi.fn());
vi.mock("@/lib/stripe/client", () => ({ stripe: { checkout: { sessions: { list } } } }));

import { hasPendingPayment } from "@/lib/stripe/pending";

const USER = { id: "u1", email: "u@x.com" };

type SessionShape = {
  payment_status?: string;
  payment_intent?: { status: string } | string | null;
  metadata?: Record<string, string>;
  client_reference_id?: string | null;
};

function session(overrides: SessionShape = {}) {
  return {
    status: "complete",
    payment_status: "unpaid",
    payment_intent: { status: "processing" },
    metadata: { user_id: "u1" },
    client_reference_id: "u1",
    ...overrides,
  };
}

const withSessions = (...sessions: unknown[]) => list.mockResolvedValue({ data: sessions });

beforeEach(() => {
  list.mockReset();
  withSessions();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("hasPendingPayment", () => {
  it("is true while a delayed payment is processing", async () => {
    withSessions(session());
    expect(await hasPendingPayment(USER)).toBe(true);
  });

  it("asks Stripe for this learner's completed sessions, with the payment expanded", async () => {
    await hasPendingPayment(USER);

    expect(list).toHaveBeenCalledWith({
      customer_details: { email: "u@x.com" },
      status: "complete",
      limit: 20,
      expand: ["data.payment_intent"],
    });
  });

  it("is false when the learner has no sessions", async () => {
    expect(await hasPendingPayment(USER)).toBe(false);
  });

  it("is false when the delayed payment failed, so the learner can try again", async () => {
    withSessions(session({ payment_intent: { status: "requires_payment_method" } }));
    expect(await hasPendingPayment(USER)).toBe(false);
  });

  it("is false for a session that is already paid", async () => {
    withSessions(session({ payment_status: "paid", payment_intent: { status: "succeeded" } }));
    expect(await hasPendingPayment(USER)).toBe(false);
  });

  it("ignores a pending session that belongs to another account with the same email", async () => {
    withSessions(
      session({ metadata: { user_id: "someone-else" }, client_reference_id: "someone-else" })
    );
    expect(await hasPendingPayment(USER)).toBe(false);
  });

  it("matches on client_reference_id when metadata has no user_id", async () => {
    withSessions(session({ metadata: {} }));
    expect(await hasPendingPayment(USER)).toBe(true);
  });

  it("is false when the payment was not expanded or is missing", async () => {
    withSessions(session({ payment_intent: "pi_123" }), session({ payment_intent: null }));
    expect(await hasPendingPayment(USER)).toBe(false);
  });

  it("finds the pending session among older failed and paid ones", async () => {
    withSessions(
      session({ payment_intent: { status: "requires_payment_method" } }),
      session(),
      session({ payment_status: "paid", payment_intent: { status: "succeeded" } })
    );
    expect(await hasPendingPayment(USER)).toBe(true);
  });

  it("is false, without throwing, when Stripe fails: a lookup error must not block a sale", async () => {
    list.mockRejectedValue(new Error("Stripe is down"));
    expect(await hasPendingPayment(USER)).toBe(false);
  });
});
