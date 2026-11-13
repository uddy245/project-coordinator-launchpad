import { describe, it, expect, vi, beforeEach } from "vitest";
import type Stripe from "stripe";

const retrieve = vi.hoisted(() => vi.fn());
const handle = vi.hoisted(() => vi.fn());

vi.mock("@/lib/stripe/client", () => ({ stripe: { checkout: { sessions: { retrieve } } } }));
vi.mock("@/lib/stripe/webhook", () => ({ handleCheckoutSessionCompleted: handle }));

import { fulfilCheckoutSession } from "@/lib/stripe/fulfil";

const SESSION_ID = "cs_test_a1B2c3D4e5F6g7H8";

function session(overrides: Partial<Stripe.Checkout.Session> = {}): Stripe.Checkout.Session {
  return {
    id: SESSION_ID,
    payment_status: "paid",
    metadata: { user_id: "u1" },
    client_reference_id: "u1",
    ...overrides,
  } as Stripe.Checkout.Session;
}

beforeEach(() => {
  retrieve.mockReset().mockResolvedValue(session());
  handle.mockReset().mockResolvedValue({ granted: true });
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("fulfilCheckoutSession", () => {
  it("grants access for the signed-in user's own paid session", async () => {
    expect(await fulfilCheckoutSession(SESSION_ID, "u1")).toBe("granted");
    expect(retrieve).toHaveBeenCalledWith(SESSION_ID);
    expect(handle).toHaveBeenCalledWith(session());
  });

  it("reports already_recorded when the webhook got there first", async () => {
    handle.mockResolvedValue({ granted: false, reason: "duplicate session (idempotent)" });
    expect(await fulfilCheckoutSession(SESSION_ID, "u1")).toBe("already_recorded");
  });

  it("reports rejected when the paid session is not the course at the course price", async () => {
    handle.mockResolvedValue({ granted: false, reason: "price=price_other", rejected: true });
    expect(await fulfilCheckoutSession(SESSION_ID, "u1")).toBe("rejected");
  });

  it("does not grant on a session that belongs to another user", async () => {
    expect(await fulfilCheckoutSession(SESSION_ID, "someone-else")).toBe("not_applicable");
    expect(handle).not.toHaveBeenCalled();
  });

  it("checks ownership by client_reference_id when metadata has no user_id", async () => {
    retrieve.mockResolvedValue(session({ metadata: {} }));
    expect(await fulfilCheckoutSession(SESSION_ID, "u1")).toBe("granted");
    expect(await fulfilCheckoutSession(SESSION_ID, "someone-else")).toBe("not_applicable");
  });

  it("does not grant when the session names no user at all", async () => {
    retrieve.mockResolvedValue(session({ metadata: {}, client_reference_id: null }));
    expect(await fulfilCheckoutSession(SESSION_ID, "u1")).toBe("not_applicable");
    expect(handle).not.toHaveBeenCalled();
  });

  it("reports not_paid for a delayed payment that has not cleared", async () => {
    retrieve.mockResolvedValue(session({ payment_status: "unpaid" }));
    expect(await fulfilCheckoutSession(SESSION_ID, "u1")).toBe("not_paid");
    expect(handle).not.toHaveBeenCalled();
  });

  it.each([
    undefined,
    "",
    "not-a-session",
    "cs_test_x'; drop table purchases;--",
    "pi_test_a1B2c3D4e5F6",
  ])("does not call Stripe for a missing or malformed session id (%s)", async (id) => {
    expect(await fulfilCheckoutSession(id, "u1")).toBe("not_applicable");
    expect(retrieve).not.toHaveBeenCalled();
  });

  it("returns error, without throwing, when Stripe fails", async () => {
    retrieve.mockRejectedValue(new Error("No such checkout.session"));
    expect(await fulfilCheckoutSession(SESSION_ID, "u1")).toBe("error");
    expect(handle).not.toHaveBeenCalled();
  });

  it("returns error, without throwing, when the grant fails", async () => {
    handle.mockRejectedValue(new Error("Failed to grant access: connection lost"));
    expect(await fulfilCheckoutSession(SESSION_ID, "u1")).toBe("error");
  });
});
