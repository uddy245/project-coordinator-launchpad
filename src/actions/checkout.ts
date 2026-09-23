"use server";

import { eq } from "drizzle-orm";
import { env } from "@/env";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { getAppUser } from "@/lib/auth/session";
import { stripe } from "@/lib/stripe/client";
import type { ActionResult } from "@/lib/types";

type CheckoutData = { url: string };

export async function createCheckoutSession(): Promise<ActionResult<CheckoutData>> {
  const user = await getAppUser();

  if (!user?.email) {
    return { ok: false, error: "You must be signed in.", code: "UNAUTHENTICATED" };
  }

  // Short-circuit if the user already has access — don't let them pay twice.
  // Owner-only: the caller's own profile row. A failed read falls through,
  // as the old `.single()` error did.
  let alreadyHasAccess = false;
  try {
    const [profile] = await db
      .select({ has_access: profiles.hasAccess })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);
    alreadyHasAccess = !!profile?.has_access;
  } catch (err) {
    console.error("[createCheckoutSession] profile read failed", err);
  }
  if (alreadyHasAccess) {
    return { ok: false, error: "You already have access.", code: "ALREADY_PURCHASED" };
  }

  const successUrl = `${env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${env.NEXT_PUBLIC_APP_URL}/checkout/cancel`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      client_reference_id: user.id,
      line_items: [{ price: env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { user_id: user.id },
      payment_intent_data: { metadata: { user_id: user.id } },
    });

    if (!session.url) {
      return { ok: false, error: "Stripe did not return a checkout URL.", code: "STRIPE_ERROR" };
    }
    return { ok: true, data: { url: session.url } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Stripe error";
    return { ok: false, error: message, code: "STRIPE_ERROR" };
  }
}
