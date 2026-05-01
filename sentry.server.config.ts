/**
 * Server-side Sentry init. No-op when SENTRY_DSN is unset.
 *
 * Wired through instrumentation.ts. Tags releases with the git SHA
 * (Vercel sets VERCEL_GIT_COMMIT_SHA automatically; locally it's empty
 * and Sentry uses its release default).
 *
 * PII filter is conservative: we strip user emails / names from event
 * extra data before they leave the process. Stack traces, breadcrumbs,
 * and explicit `Sentry.captureException` payloads still flow.
 */

import * as Sentry from "@sentry/nextjs";

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
    beforeSend(event) {
      // Best-effort PII scrub on the user object.
      if (event.user) {
        event.user = {
          id: event.user.id ?? "[redacted]",
          // drop email / name / ip — we don't need them and don't want them.
        };
      }
      // Strip email-shaped strings from breadcrumb messages.
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((b) => ({
          ...b,
          message: scrub(b.message),
        }));
      }
      return event;
    },
  });
}

function scrub(s: string | undefined): string | undefined {
  if (!s) return s;
  return s.replace(/[\w._%+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[email]");
}
