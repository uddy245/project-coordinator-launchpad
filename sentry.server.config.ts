/**
 * Server-side Sentry init. No-op when SENTRY_DSN is unset.
 *
 * Wired through instrumentation.ts. Tags releases with the git SHA
 * (Vercel sets VERCEL_GIT_COMMIT_SHA automatically; locally it's empty
 * and Sentry uses its release default).
 *
 * PII filter strategy (server-side):
 *  - Drop user.email / user.name / user.ip — keep id only
 *  - Strip email/JWT/Bearer/credit-card-ish tokens from messages, breadcrumbs, URLs
 *  - Drop the entire request.headers and request.cookies objects (auth tokens)
 *  - Drop request bodies; redact sensitive keys (password, token, code, …)
 *    at any depth in breadcrumbs, extra and contexts
 *
 * The filter is intentionally aggressive — Sentry is for stack frames and
 * call paths, not for replaying user data. Stack traces and the literal
 * argument to Sentry.captureException are preserved.
 */

import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "./src/lib/observability/scrub-event";

const dsn = process.env.SENTRY_DSN;
const release = process.env.VERCEL_GIT_COMMIT_SHA;
const environment =
  process.env.VERCEL_ENV || (process.env.NODE_ENV === "production" ? "production" : "development");

if (dsn) {
  Sentry.init({
    dsn,
    environment,
    release,
    // Capture 10% of transactions in production; full sampling in dev/preview.
    tracesSampleRate: environment === "production" ? 0.1 : 1.0,
    // Don't auto-instrument private project info.
    sendDefaultPii: false,
    // Shared PII/secret filter (src/lib/observability/scrub-event.ts).
    beforeSend: scrubEvent,
  });
}
