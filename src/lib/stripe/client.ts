import Stripe from "stripe";
import { env } from "@/env";

// Pin the API version. Bumping is a deliberate PR — never use "latest" in prod.
export const STRIPE_API_VERSION = "2025-02-24.acacia" as const;

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: STRIPE_API_VERSION,
  typescript: true,
});
