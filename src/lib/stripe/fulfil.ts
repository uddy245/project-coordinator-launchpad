import "server-only";
import { stripe } from "@/lib/stripe/client";
import { handleCheckoutSessionCompleted } from "@/lib/stripe/webhook";

export type FulfilResult =
  /** Access was granted by this call. */
  | "granted"
  /** The purchase was already recorded (usually by the webhook). */
  | "already_recorded"
  /** Stripe has not received the money yet (a delayed payment method). */
  | "not_paid"
  /** No usable session id, or the session belongs to someone else. */
  | "not_applicable"
  /** Stripe or the database failed; the webhook remains the fallback. */
  | "error";

// Checkout Session ids look like cs_test_a1B2… / cs_live_a1B2…
const SESSION_ID = /^cs_[A-Za-z0-9_]{10,200}$/;

/**
 * Fulfil a Checkout Session when the customer lands back on our site.
 *
 * The webhook is the primary path, but it can be late, misconfigured or
 * failing while the customer is already looking at the success page. This
 * asks Stripe for the session named in the return URL and, if it is paid and
 * belongs to the signed-in user, runs the same idempotent handler the webhook
 * uses. Whichever arrives second is a no-op.
 *
 * The session id comes from the URL, so it is untrusted: a session is only
 * honoured when Stripe says it was created for `userId`. Never throws.
 */
export async function fulfilCheckoutSession(
  sessionId: string | undefined,
  userId: string
): Promise<FulfilResult> {
  if (!sessionId || !SESSION_ID.test(sessionId)) return "not_applicable";

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const owner = session.metadata?.user_id ?? session.client_reference_id;
    if (owner !== userId) return "not_applicable";
    if (session.payment_status !== "paid") return "not_paid";

    const { granted } = await handleCheckoutSessionCompleted(session);
    return granted ? "granted" : "already_recorded";
  } catch (err) {
    console.error("[fulfilCheckoutSession] failed", err);
    return "error";
  }
}
