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

// Release tag — Next inlines NEXT_PUBLIC_* into the client bundle at build
// time. Vercel exposes the commit SHA on its build env; locally this is
// undefined and Sentry falls back to its own release detection.
const release = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || undefined;

if (dsn) {
  Sentry.init({
    dsn,
    environment,
    release,
    tracesSampleRate: environment === "production" ? 0.1 : 1.0,
    // Replay disabled by default — opt in later if useful.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.05,
    sendDefaultPii: false,
    // Don't capture noisy expected errors.
    ignoreErrors: ["ResizeObserver loop limit exceeded", "Network request failed", "Load failed"],
    beforeSend(event) {
      // PII filtering — keep parity with server config. We never want to
      // leak emails, tokens, or auth headers in client-side error events.
      if (event.user) event.user = { id: event.user.id ?? "[redacted]" };
      if (event.message) event.message = scrub(event.message)!;
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((b) => ({
          ...b,
          message: scrub(b.message),
        }));
      }
      if (event.request?.url) event.request.url = scrub(event.request.url);
      if (event.request?.headers) event.request.headers = {};
      if (event.request?.cookies) event.request.cookies = {};
      return event;
    },
  });
}

function scrub(s: string | undefined): string | undefined {
  if (!s) return s;
  return s
    .replace(/[\w._%+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[email]")
    .replace(/\b\d{13,19}\b/g, "[number]")
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer [redacted]")
    .replace(/\b(sk|pk)_(live|test)_[A-Za-z0-9]+/g, "$1_$2_[redacted]")
    .replace(/\beyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+/g, "[jwt]");
}

// Re-export the router transition wrapper so route changes are recorded
// on the same root transaction as the navigation. Sentry sets this up
// automatically when present.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
