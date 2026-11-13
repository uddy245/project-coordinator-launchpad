import { describe, it, expect, vi, beforeEach } from "vitest";
import type Stripe from "stripe";

const listLineItems = vi.hoisted(() => vi.fn());
vi.mock("@/lib/stripe/client", () => ({ stripe: { checkout: { sessions: { listLineItems } } } }));

import { env } from "@/env";
import { verifyCoursePurchase } from "@/lib/stripe/verify-purchase";

const PRICE = env.STRIPE_PRICE_ID;

function session(overrides: Partial<Stripe.Checkout.Session> = {}): Stripe.Checkout.Session {
  return {
    id: "cs_test_1",
    mode: "payment",
    payment_status: "paid",
    amount_total: 74900,
    currency: "usd",
    ...overrides,
  } as Stripe.Checkout.Session;
}

type Item = {
  price: { id: string; unit_amount: number | null; currency: string } | null;
  quantity: number;
};

const item = (overrides: Partial<Item> = {}): Item => ({
  price: { id: PRICE, unit_amount: 74900, currency: "usd" },
  quantity: 1,
  ...overrides,
});

const withItems = (items: Item[], hasMore = false) =>
  listLineItems.mockResolvedValue({ data: items, has_more: hasMore });

beforeEach(() => {
  listLineItems.mockReset();
  withItems([item()]);
});

describe("verifyCoursePurchase", () => {
  it("accepts a one-time payment of one course at the course price", async () => {
    expect(await verifyCoursePurchase(session())).toEqual({ ok: true });
    expect(listLineItems).toHaveBeenCalledWith("cs_test_1", { limit: 2 });
  });

  it.each(["subscription", "setup"] as const)(
    "rejects mode=%s without asking Stripe for line items",
    async (mode) => {
      expect(await verifyCoursePurchase(session({ mode }))).toEqual({
        ok: false,
        reason: `mode=${mode}`,
      });
      expect(listLineItems).not.toHaveBeenCalled();
    }
  );

  it("rejects a different price", async () => {
    withItems([item({ price: { id: "price_other", unit_amount: 74900, currency: "usd" } })]);
    expect(await verifyCoursePurchase(session())).toEqual({
      ok: false,
      reason: "price=price_other",
    });
  });

  it("rejects a line item with no price", async () => {
    withItems([item({ price: null })]);
    expect(await verifyCoursePurchase(session())).toMatchObject({
      ok: false,
      reason: "price=none",
    });
  });

  it("rejects no line items, more than one, or more than a page", async () => {
    withItems([]);
    expect(await verifyCoursePurchase(session())).toMatchObject({ ok: false });
    withItems([item(), item()]);
    expect(await verifyCoursePurchase(session())).toMatchObject({ ok: false });
    withItems([item()], true);
    expect(await verifyCoursePurchase(session())).toMatchObject({ ok: false });
  });

  it("rejects a quantity other than 1", async () => {
    withItems([item({ quantity: 2 })]);
    expect(await verifyCoursePurchase(session({ amount_total: 149800 }))).toEqual({
      ok: false,
      reason: "quantity=2",
    });
  });

  it("rejects an amount that is not the price's unit amount", async () => {
    expect(await verifyCoursePurchase(session({ amount_total: 100 }))).toEqual({
      ok: false,
      reason: "amount=100 usd, expected 74900 usd",
    });
  });

  it("rejects a currency that is not the price's currency", async () => {
    expect(await verifyCoursePurchase(session({ currency: "eur" }))).toMatchObject({ ok: false });
  });

  it("rejects a price with no fixed unit amount", async () => {
    withItems([item({ price: { id: PRICE, unit_amount: null, currency: "usd" } })]);
    expect(await verifyCoursePurchase(session())).toMatchObject({ ok: false });
  });

  it("throws when Stripe fails, so the webhook answers 500 and Stripe retries", async () => {
    listLineItems.mockRejectedValue(new Error("Stripe is down"));
    await expect(verifyCoursePurchase(session())).rejects.toThrow(/Stripe is down/);
  });
});
