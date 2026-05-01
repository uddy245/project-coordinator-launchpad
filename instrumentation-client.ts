/**
 * Browser-side Sentry init. No-op when NEXT_PUBLIC_SENTRY_DSN is unset.
 *
 * Loaded automatically by Next.js as the client instrumentation entry.
 * No imports of `@/env` here — we read process.env directly because
 * client-side env validation already happens via @t3-oss/env-nextjs and
 * we want to keep this file lean / failsafe.
 */

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
// VERCEL_ENV is server-only; on the client we infer environment from the host.
const environment =
  typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "development"
    : "production";

if (dsn) {
  Sentry.init({
    dsn,
    environment,
    tracesSampleRate: environment === "production" ? 0.1 : 1.0,
    // Replay disabled by default — opt in later if useful.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.05,
    sendDefaultPii: false,
    // Don't capture noisy expected errors.
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "Network request failed",
      "Load failed",
    ],
  });
}

// Re-export the router transition wrapper so route changes are recorded
// on the same root transaction as the navigation. Sentry sets this up
// automatically when present.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
