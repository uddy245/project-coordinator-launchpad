import { type NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { env } from "@/env";
import { stripe } from "@/lib/stripe/client";
import { handleCheckoutSessionCompleted } from "@/lib/stripe/webhook";

// Stripe requires the raw request body to verify the signature. Node runtime
// is needed for `crypto` used by Stripe's constructEvent.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json(
      { error: `Signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const result = await handleCheckoutSessionCompleted(session);
        return NextResponse.json({ received: true, ...result });
      }
      default:
        // Log-only for unhandled event types. Still return 200 so Stripe
        // does not retry forever.
        return NextResponse.json({ received: true, ignored: event.type });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    // Return 500 so Stripe retries.
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
