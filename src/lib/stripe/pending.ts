import "server-only";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe/client";

/** How many of the learner's most recent completed sessions to look at. */
const RECENT_SESSIONS = 20;

function ownerOf(session: Stripe.Checkout.Session): string | null {
  return session.metadata?.user_id ?? session.client_reference_id ?? null;
}

/**
 * Has this learner already paid with a delayed method (a bank debit) that
 * has not cleared yet?
 *
 * Such a learner has finished checkout but has no access and no purchases
 * row until Stripe sends async_payment_succeeded, days later. In that gap
 * the dashboard still shows the purchase button, and a second checkout would
 * charge them twice.
 *
 * Stripe is the source of truth: a pending payment is a completed session of
 * theirs that is unpaid and whose PaymentIntent is still "processing". A
 * failed delayed payment is also complete + unpaid, but its PaymentIntent is
 * "requires_payment_method", so that learner can try again.
 *
 * Sessions are looked up by the email we prefilled at checkout and then
 * matched on our own user id, so another account using the same address is
 * never counted. A failed lookup returns false: it must not stop a sale.
 */
export async function hasPendingPayment(user: { id: string; email: string }): Promise<boolean> {
  try {
    const sessions = await stripe.checkout.sessions.list({
      customer_details: { email: user.email },
      status: "complete",
      limit: RECENT_SESSIONS,
      expand: ["data.payment_intent"],
    });

    return sessions.data.some(
      (session) =>
        ownerOf(session) === user.id &&
        session.payment_status === "unpaid" &&
        typeof session.payment_intent === "object" &&
        session.payment_intent?.status === "processing"
    );
  } catch (err) {
    console.error("[hasPendingPayment] Stripe lookup failed", err);
    return false;
  }
}
