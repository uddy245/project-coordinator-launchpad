import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const constructEvent = vi.hoisted(() => vi.fn());
const handle = vi.hoisted(() => vi.fn());
const testEnv = vi.hoisted(() => ({ STRIPE_WEBHOOK_SECRET: "whsec_test" as string | undefined }));

vi.mock("@/env", () => ({ env: testEnv }));
vi.mock("@/lib/stripe/client", () => ({ stripe: { webhooks: { constructEvent } } }));
vi.mock("@/lib/stripe/webhook", () => ({ handleCheckoutSessionCompleted: handle }));

import { POST } from "@/app/api/stripe/webhook/route";

function request(signature: string | null = "sig"): NextRequest {
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    body: "{}",
    headers: signature ? { "stripe-signature": signature } : {},
  }) as unknown as NextRequest;
}

function event(type: string, paymentStatus: string) {
  return { type, data: { object: { id: "cs_test_1", payment_status: paymentStatus } } };
}

beforeEach(() => {
  testEnv.STRIPE_WEBHOOK_SECRET = "whsec_test";
  constructEvent.mockReset();
  handle.mockReset().mockResolvedValue({ granted: true });
});

describe("POST /api/stripe/webhook", () => {
  it("grants access on checkout.session.completed", async () => {
    constructEvent.mockReturnValue(event("checkout.session.completed", "paid"));

    const res = await POST(request());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true, granted: true });
    expect(handle).toHaveBeenCalledWith({ id: "cs_test_1", payment_status: "paid" });
  });

  it("grants access when a delayed payment clears (async_payment_succeeded)", async () => {
    constructEvent.mockReturnValue(event("checkout.session.async_payment_succeeded", "paid"));

    const res = await POST(request());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true, granted: true });
    expect(handle).toHaveBeenCalledWith({ id: "cs_test_1", payment_status: "paid" });
  });

  it("acknowledges a failed delayed payment without granting anything", async () => {
    constructEvent.mockReturnValue(event("checkout.session.async_payment_failed", "unpaid"));

    const res = await POST(request());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      received: true,
      ignored: "checkout.session.async_payment_failed",
    });
    expect(handle).not.toHaveBeenCalled();
  });

  it("returns 500 when the handler throws, so Stripe retries", async () => {
    constructEvent.mockReturnValue(event("checkout.session.async_payment_succeeded", "paid"));
    handle.mockRejectedValue(new Error("Failed to grant access: connection lost"));

    const res = await POST(request());

    expect(res.status).toBe(500);
  });

  it("rejects a request with no signature", async () => {
    const res = await POST(request(null));

    expect(res.status).toBe(400);
    expect(handle).not.toHaveBeenCalled();
  });

  it("rejects a request whose signature does not verify", async () => {
    constructEvent.mockImplementation(() => {
      throw new Error("No signatures found matching the expected signature");
    });

    const res = await POST(request());

    expect(res.status).toBe(400);
    expect(handle).not.toHaveBeenCalled();
  });

  it("returns 500 when the webhook secret is not configured", async () => {
    testEnv.STRIPE_WEBHOOK_SECRET = undefined;

    const res = await POST(request());

    expect(res.status).toBe(500);
    expect(constructEvent).not.toHaveBeenCalled();
  });
});
