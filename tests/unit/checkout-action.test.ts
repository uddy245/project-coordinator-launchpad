import { describe, it, expect, vi, beforeEach } from "vitest";

const { getUserMock, singleMock, createSessionMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  singleMock: vi.fn(),
  createSessionMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: getUserMock },
    from: () => ({
      select: () => ({ eq: () => ({ single: singleMock }) }),
    }),
  }),
}));

vi.mock("@/lib/stripe/client", () => ({
  stripe: { checkout: { sessions: { create: createSessionMock } } },
  STRIPE_API_VERSION: "2025-02-24.acacia",
}));

import { createCheckoutSession } from "@/actions/checkout";

beforeEach(() => {
  getUserMock.mockReset();
  singleMock.mockReset();
  createSessionMock.mockReset();
});

describe("createCheckoutSession", () => {
  it("returns UNAUTHENTICATED when there is no user", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const result = await createCheckoutSession();
    expect(result).toMatchObject({ ok: false, code: "UNAUTHENTICATED" });
    expect(createSessionMock).not.toHaveBeenCalled();
  });

  it("returns ALREADY_PURCHASED when profile.has_access is true", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1", email: "u@x.com" } } });
    singleMock.mockResolvedValue({ data: { has_access: true } });
    const result = await createCheckoutSession();
    expect(result).toMatchObject({ ok: false, code: "ALREADY_PURCHASED" });
    expect(createSessionMock).not.toHaveBeenCalled();
  });

  it("creates a Stripe session with the pinned price and user metadata", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1", email: "u@x.com" } } });
    singleMock.mockResolvedValue({ data: { has_access: false } });
    createSessionMock.mockResolvedValue({ url: "https://checkout.stripe.com/abc" });

    const result = await createCheckoutSession();

    expect(result).toEqual({ ok: true, data: { url: "https://checkout.stripe.com/abc" } });
    expect(createSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "payment",
        customer_email: "u@x.com",
        client_reference_id: "u1",
        line_items: [{ price: expect.any(String), quantity: 1 }],
        success_url: expect.stringContaining("/checkout/success?session_id={CHECKOUT_SESSION_ID}"),
        cancel_url: expect.stringContaining("/checkout/cancel"),
        metadata: { user_id: "u1" },
      })
    );
  });

  it("returns STRIPE_ERROR when Stripe throws", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1", email: "u@x.com" } } });
    singleMock.mockResolvedValue({ data: { has_access: false } });
    createSessionMock.mockRejectedValue(new Error("Stripe is down"));

    const result = await createCheckoutSession();
    expect(result).toMatchObject({ ok: false, code: "STRIPE_ERROR" });
  });

  it("returns STRIPE_ERROR when Stripe response has no url", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1", email: "u@x.com" } } });
    singleMock.mockResolvedValue({ data: { has_access: false } });
    createSessionMock.mockResolvedValue({ url: null });

    const result = await createCheckoutSession();
    expect(result).toMatchObject({ ok: false, code: "STRIPE_ERROR" });
  });
});
