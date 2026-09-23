import { describe, it, expect, vi, beforeEach } from "vitest";

const { getAppUserMock, createSessionMock } = vi.hoisted(() => ({
  getAppUserMock: vi.fn(),
  createSessionMock: vi.fn(),
}));
const fakeDb = await vi.hoisted(async () => (await import("../helpers/fake-db")).createFakeDb());

vi.mock("@/db", () => ({ db: fakeDb.db }));
vi.mock("@/lib/auth/session", () => ({ getAppUser: getAppUserMock }));
vi.mock("@/lib/stripe/client", () => ({
  stripe: { checkout: { sessions: { create: createSessionMock } } },
  STRIPE_API_VERSION: "2025-02-24.acacia",
}));

import { createCheckoutSession } from "@/actions/checkout";

const USER = { id: "u1", email: "u@x.com", name: null, neonAuthUserId: "n1" };

function withProfile(profile: { has_access: boolean } | null | Error) {
  fakeDb.reset((q) => {
    if (q.op === "select" && q.table === "profiles") {
      return profile instanceof Error ? profile : profile ? [profile] : [];
    }
    return [];
  });
}

beforeEach(() => {
  getAppUserMock.mockReset();
  createSessionMock.mockReset();
  withProfile({ has_access: false });
});

describe("createCheckoutSession", () => {
  it("returns UNAUTHENTICATED when there is no user", async () => {
    getAppUserMock.mockResolvedValue(null);
    const result = await createCheckoutSession();
    expect(result).toMatchObject({ ok: false, code: "UNAUTHENTICATED" });
    expect(createSessionMock).not.toHaveBeenCalled();
  });

  it("returns ALREADY_PURCHASED when profile.has_access is true", async () => {
    getAppUserMock.mockResolvedValue(USER);
    withProfile({ has_access: true });
    const result = await createCheckoutSession();
    expect(result).toMatchObject({ ok: false, code: "ALREADY_PURCHASED" });
    expect(createSessionMock).not.toHaveBeenCalled();
  });

  it("creates a Stripe session with the pinned price and user metadata", async () => {
    getAppUserMock.mockResolvedValue(USER);
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

  it("falls through to Stripe when the profile read fails", async () => {
    getAppUserMock.mockResolvedValue(USER);
    withProfile(new Error("connection reset"));
    createSessionMock.mockResolvedValue({ url: "https://checkout.stripe.com/abc" });
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await createCheckoutSession();
    expect(result).toEqual({ ok: true, data: { url: "https://checkout.stripe.com/abc" } });
  });

  it("returns STRIPE_ERROR when Stripe throws", async () => {
    getAppUserMock.mockResolvedValue(USER);
    createSessionMock.mockRejectedValue(new Error("Stripe is down"));

    const result = await createCheckoutSession();
    expect(result).toMatchObject({ ok: false, code: "STRIPE_ERROR" });
  });

  it("returns STRIPE_ERROR when Stripe response has no url", async () => {
    getAppUserMock.mockResolvedValue(USER);
    createSessionMock.mockResolvedValue({ url: null });

    const result = await createCheckoutSession();
    expect(result).toMatchObject({ ok: false, code: "STRIPE_ERROR" });
  });
});
