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
 *  - Redact sensitive keys (password, token, authorization, cookie, x-api-key)
 *    from breadcrumb data values
 *
 * The filter is intentionally aggressive — Sentry is for stack frames and
 * call paths, not for replaying user data. Stack traces and the literal
 * argument to Sentry.captureException are preserved.
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
      // 1. User — keep id only.
      if (event.user) {
        event.user = { id: event.user.id ?? "[redacted]" };
      }
      // 2. Breadcrumbs — scrub message + data.
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((b) => ({
          ...b,
          message: scrub(b.message),
          data: scrubData(b.data),
        }));
      }
      // 3. Top-level message.
      if (event.message) event.message = scrub(event.message)!;
      // 4. Request — drop headers/cookies entirely; scrub URL and query.
      if (event.request?.headers) event.request.headers = {};
      if (event.request?.cookies) event.request.cookies = {};
      if (event.request?.url) event.request.url = scrub(event.request.url);
      if (event.request?.query_string) {
        event.request.query_string = scrub(
          typeof event.request.query_string === "string"
            ? event.request.query_string
            : "",
        );
      }
      // 5. Extra / contexts — best-effort scrub of any string values.
      if (event.extra) event.extra = scrubData(event.extra) ?? event.extra;
      return event;
    },
  });
}

function scrub(s: string | undefined): string | undefined {
  if (!s) return s;
  return s
    .replace(/[\w._%+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[email]")
    // 13-19 digit sequences (credit card-shaped) — overzealous on purpose.
    .replace(/\b\d{13,19}\b/g, "[number]")
    // Bearer tokens / common API-key prefixes / JWTs.
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer [redacted]")
    .replace(/\b(sk|pk)_(live|test)_[A-Za-z0-9]+/g, "$1_$2_[redacted]")
    .replace(/\beyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+/g, "[jwt]");
}

function scrubData(
  d: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!d) return d;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(d)) {
    const lk = k.toLowerCase();
    if (
      lk === "password" ||
      lk === "token" ||
      lk === "authorization" ||
      lk === "cookie" ||
      lk === "x-api-key" ||
      lk === "api_key" ||
      lk === "secret"
    ) {
      out[k] = "[redacted]";
    } else if (typeof v === "string") {
      out[k] = scrub(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}
