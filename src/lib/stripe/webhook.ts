import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles, purchases } from "@/db/schema";
import { sendEmail } from "@/lib/email/send";
import { renderPurchaseConfirmed } from "@/lib/email/templates/purchase-confirmed";
import { verifyCoursePurchase } from "@/lib/stripe/verify-purchase";

export type HandleResult =
  | { granted: true }
  /** `rejected`: paid, but not a purchase of the course (see verifyCoursePurchase). */
  | { granted: false; reason: string; rejected?: true };

/**
 * Handle a paid Checkout Session. Idempotent on stripe_session_id.
 *
 * Contract:
 *   - On first successful delivery: insert a purchases row and flip
 *     profiles.has_access to true for the user encoded in metadata, in ONE
 *     transaction. A recorded purchase therefore always means access was
 *     granted with it.
 *   - If the grant fails (database error, or no profile row to update), the
 *     purchase insert is rolled back and this throws, so Stripe's retry
 *     starts from scratch. Recording the purchase first and granting
 *     afterwards let a retry see "duplicate" and never grant.
 *   - On duplicate delivery: the insert hits ON CONFLICT (stripe_session_id)
 *     DO NOTHING, returns no row, and we no-op. It does not re-grant, so
 *     access removed later (a refund) stays removed.
 *   - On a session with no user_id in metadata: log and ignore.
 *   - On a paid session that is not the course at the course price (wrong
 *     mode, price or amount): log, grant nothing, return `rejected`.
 */
export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<HandleResult> {
  const userId = session.metadata?.user_id ?? session.client_reference_id;
  if (!userId) {
    return { granted: false, reason: "no user_id in metadata" };
  }

  if (session.payment_status !== "paid") {
    return { granted: false, reason: `payment_status=${session.payment_status}` };
  }

  const check = await verifyCoursePurchase(session);
  if (!check.ok) {
    console.error(
      `[stripe] session ${session.id} for user ${userId} is not a course purchase (${check.reason}); access not granted`
    );
    return { granted: false, reason: check.reason, rejected: true };
  }

  const isNewPurchase = await db.transaction(async (tx) => {
    let insertedRows: { id: string }[];
    try {
      insertedRows = await tx
        .insert(purchases)
        .values({
          userId,
          stripeSessionId: session.id,
          stripePaymentIntentId:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : (session.payment_intent?.id ?? null),
          amountCents: session.amount_total ?? 0,
          currency: session.currency ?? "usd",
          status: "paid",
        })
        // purchases.stripe_session_id is UNIQUE — duplicate delivery no-ops.
        .onConflictDoNothing({ target: purchases.stripeSessionId })
        .returning({ id: purchases.id });
    } catch (err) {
      throw new Error(
        `Failed to insert purchase: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    if (insertedRows.length === 0) return false;

    // Setting has_access fires the DB trigger that creates gate_status.
    let grantedRows: { id: string }[];
    try {
      grantedRows = await tx
        .update(profiles)
        .set({ hasAccess: true })
        .where(eq(profiles.id, userId))
        .returning({ id: profiles.id });
    } catch (err) {
      throw new Error(
        `Failed to grant access: ${err instanceof Error ? err.message : String(err)}`
      );
    }
    if (grantedRows.length === 0) {
      throw new Error(`Failed to grant access: no profile row for user ${userId}`);
    }
    return true;
  });

  if (!isNewPurchase) {
    return { granted: false, reason: "duplicate session (idempotent)" };
  }

  // Confirmation email (silent / fire-and-forget). We resolve the recipient
  // off the customer profile; if anything is missing we just skip — Stripe
  // already sends its own receipt and the user has access regardless.
  void (async () => {
    try {
      const [profile] = await db
        .select({ full_name: profiles.fullName })
        .from(profiles)
        .where(eq(profiles.id, userId))
        .limit(1);
      const customerEmail = session.customer_details?.email ?? session.customer_email ?? null;
      if (!customerEmail) return;

      const fullName = profile?.full_name ?? null;
      const firstName = fullName ? (fullName.split(/\s+/)[0] ?? null) : null;
      const amountCents = session.amount_total ?? 0;
      // Stripe attaches the hosted receipt URL on the latest charge; if it's
      // not available we still send the email — just without the receipt CTA.
      let receiptUrl: string | null = null;
      try {
        const piId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : (session.payment_intent?.id ?? null);
        if (piId) {
          const { stripe } = await import("@/lib/stripe/client");
          const pi = await stripe.paymentIntents.retrieve(piId, {
            expand: ["latest_charge"],
          });
          const latest = pi.latest_charge;
          if (typeof latest === "object" && latest && "receipt_url" in latest) {
            receiptUrl = (latest as { receipt_url: string | null }).receipt_url;
          }
        }
      } catch {
        // best-effort
      }

      await sendEmail({
        to: { email: customerEmail, name: fullName },
        render: renderPurchaseConfirmed({
          firstName,
          amountUsd: amountCents / 100,
          receiptUrl,
        }),
        silent: true,
        tag: "purchase-confirmed",
      });
    } catch (err) {
      console.error("[email] purchase-confirmed send failed:", err);
    }
  })();

  return { granted: true };
}
