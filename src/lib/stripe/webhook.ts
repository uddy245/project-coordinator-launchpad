import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

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

  return { granted: true };
}
