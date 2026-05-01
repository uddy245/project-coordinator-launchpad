import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { renderPurchaseConfirmed } from "@/lib/email/templates/purchase-confirmed";

/**
 * Handle checkout.session.completed. Idempotent on stripe_session_id —
 * duplicate delivery returns early and does not re-grant access.
 *
 * Contract:
 *   - On first successful delivery: insert a purchases row, flip
 *     profiles.has_access to true for the user encoded in metadata.
 *   - On duplicate delivery: detect the unique-violation and no-op.
 *   - On a session with no user_id in metadata: log and ignore.
 */
export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<{ granted: boolean; reason?: string }> {
  const userId = session.metadata?.user_id ?? session.client_reference_id;
  if (!userId) {
    return { granted: false, reason: "no user_id in metadata" };
  }

  if (session.payment_status !== "paid") {
    return { granted: false, reason: `payment_status=${session.payment_status}` };
  }

  const admin = createAdminClient();

  const { error: insertError } = await admin.from("purchases").insert({
    user_id: userId,
    stripe_session_id: session.id,
    stripe_payment_intent_id:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : (session.payment_intent?.id ?? null),
    amount_cents: session.amount_total ?? 0,
    currency: session.currency ?? "usd",
    status: "paid",
  });

  if (insertError) {
    // 23505 = unique_violation on stripe_session_id — duplicate delivery.
    // Supabase returns the Postgres code on `.code`.
    if ((insertError as { code?: string }).code === "23505") {
      return { granted: false, reason: "duplicate session (idempotent)" };
    }
    throw new Error(`Failed to insert purchase: ${insertError.message}`);
  }

  const { error: updateError } = await admin
    .from("profiles")
    .update({ has_access: true })
    .eq("id", userId);

  if (updateError) {
    throw new Error(`Failed to grant access: ${updateError.message}`);
  }

  // Confirmation email (silent / fire-and-forget). We resolve the recipient
  // off the customer profile; if anything is missing we just skip — Stripe
  // already sends its own receipt and the user has access regardless.
  void (async () => {
    try {
      const { data: profile } = await admin
        .from("profiles")
        .select("full_name")
        .eq("id", userId)
        .maybeSingle();
      const customerEmail =
        session.customer_details?.email ?? session.customer_email ?? null;
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
