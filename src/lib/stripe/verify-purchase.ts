import "server-only";
import type Stripe from "stripe";
import { env } from "@/env";
import { stripe } from "@/lib/stripe/client";

export type PurchaseCheck = { ok: true } | { ok: false; reason: string };

/**
 * Is this paid Checkout Session a purchase of the course, at the course price?
 *
 * Every paid session on the Stripe account reaches the webhook, including
 * ones this app did not create (a payment link, a subscription, another
 * product, a test price). Only a session that matches what
 * createCheckoutSession creates may grant access:
 *
 *   - mode "payment" (a one-time charge, not a subscription or setup);
 *   - exactly one line item, quantity 1, at env.STRIPE_PRICE_ID;
 *   - amount_total and currency equal to that Price's unit_amount and
 *     currency, as Stripe reports it.
 *
 * Line items are not part of the session object (in the webhook payload or
 * from sessions.retrieve), so they are fetched. A Stripe error throws: the
 * webhook then answers 500 and Stripe retries.
 */
export async function verifyCoursePurchase(
  session: Stripe.Checkout.Session
): Promise<PurchaseCheck> {
  if (session.mode !== "payment") {
    return { ok: false, reason: `mode=${session.mode}` };
  }

  const items = await stripe.checkout.sessions.listLineItems(session.id, { limit: 2 });
  if (items.data.length !== 1 || items.has_more) {
    return { ok: false, reason: `line_items=${items.has_more ? "2+" : items.data.length}` };
  }

  const [item] = items.data;
  const price = item.price;
  if (!price || price.id !== env.STRIPE_PRICE_ID) {
    return { ok: false, reason: `price=${price?.id ?? "none"}` };
  }
  if (item.quantity !== 1) {
    return { ok: false, reason: `quantity=${item.quantity}` };
  }

  if (
    price.unit_amount === null ||
    session.amount_total !== price.unit_amount ||
    session.currency !== price.currency
  ) {
    return {
      ok: false,
      reason: `amount=${session.amount_total} ${session.currency}, expected ${price.unit_amount} ${price.currency}`,
    };
  }

  return { ok: true };
}
