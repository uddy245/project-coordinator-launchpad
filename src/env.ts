import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Read process.env, coercing empty strings to undefined.
 *
 * Why: shells (e.g. Claude Desktop, certain IDE integrations) sometimes
 * export `ANTHROPIC_API_KEY=""` or other empty values, and Next.js's
 * .env.local loader does NOT override existing process.env entries —
 * even if those entries are empty strings. The empty string then passes
 * `.optional()` (because it's still a string), and required keys like
 * `.min(1)` fail with a confusing message at module-eval time.
 *
 * Coercing empty → undefined makes `.optional()` fall through to defaults,
 * and `.min(1)` produces a clear "Required" error if the value really is
 * missing. Either way, .env.local "wins" against an empty shell var,
 * because t3-env reads process.env via this helper after Next.js has
 * already merged .env.local in.
 */
function E(key: string): string | undefined {
  const v = process.env[key];
  return v === undefined || v === "" ? undefined : v;
}

export const env = createEnv({
  onValidationError: (error) => {
    throw new Error(`Invalid environment variables: ${error.message}`);
  },
  server: {
    // Supabase
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

    // Anthropic
    ANTHROPIC_API_KEY: z.string().min(1),
    ANTHROPIC_MODEL: z.string().default("claude-sonnet-4-5"),
    ANTHROPIC_SPEND_CAP_USD: z.coerce.number().default(100),

    // Stripe
    STRIPE_SECRET_KEY: z.string().min(1),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    STRIPE_PRICE_ID: z.string().min(1),

    // Bunny Stream
    BUNNY_STREAM_LIBRARY_ID: z.string().optional(),
    BUNNY_STREAM_API_KEY: z.string().optional(),

    // Email
    RESEND_API_KEY: z.string().optional(),
    // Allow either plain email or "Display Name <addr@domain>" format.
    RESEND_FROM_EMAIL: z.string().min(3).default("Launchpad <onboarding@resend.dev>"),

    // Internal: shared secret the server action uses to trigger the
    // grading worker route without being impersonable by third parties.
    GRADE_WORKER_SECRET: z.string().min(32),

    // Sentry — server-side DSN. NEXT_PUBLIC_SENTRY_DSN below is the
    // browser-side equivalent. Both default to undefined; when unset,
    // Sentry init is a no-op.
    SENTRY_DSN: z.string().optional(),
  },

  client: {
    // Supabase
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),

    // Stripe
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),

    // App
    NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),

    // Observability
    NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().url().default("https://app.posthog.com"),
    NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  },

  runtimeEnv: {
    SUPABASE_SERVICE_ROLE_KEY: E("SUPABASE_SERVICE_ROLE_KEY"),
    ANTHROPIC_API_KEY: E("ANTHROPIC_API_KEY"),
    ANTHROPIC_MODEL: E("ANTHROPIC_MODEL"),
    ANTHROPIC_SPEND_CAP_USD: E("ANTHROPIC_SPEND_CAP_USD"),
    STRIPE_SECRET_KEY: E("STRIPE_SECRET_KEY"),
    STRIPE_WEBHOOK_SECRET: E("STRIPE_WEBHOOK_SECRET"),
    STRIPE_PRICE_ID: E("STRIPE_PRICE_ID"),
    BUNNY_STREAM_LIBRARY_ID: E("BUNNY_STREAM_LIBRARY_ID"),
    BUNNY_STREAM_API_KEY: E("BUNNY_STREAM_API_KEY"),
    RESEND_API_KEY: E("RESEND_API_KEY"),
    RESEND_FROM_EMAIL: E("RESEND_FROM_EMAIL"),
    GRADE_WORKER_SECRET: E("GRADE_WORKER_SECRET"),
    SENTRY_DSN: E("SENTRY_DSN"),
    NEXT_PUBLIC_SUPABASE_URL: E("NEXT_PUBLIC_SUPABASE_URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: E("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: E("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
    NEXT_PUBLIC_APP_URL: E("NEXT_PUBLIC_APP_URL"),
    NEXT_PUBLIC_POSTHOG_KEY: E("NEXT_PUBLIC_POSTHOG_KEY"),
    NEXT_PUBLIC_POSTHOG_HOST: E("NEXT_PUBLIC_POSTHOG_HOST"),
    NEXT_PUBLIC_SENTRY_DSN: E("NEXT_PUBLIC_SENTRY_DSN"),
  },

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
