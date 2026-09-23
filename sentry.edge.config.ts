/**
 * Edge-runtime Sentry init. Mirrors the server config but runs in the
 * edge runtime (middleware, edge route handlers). No-op when SENTRY_DSN
 * is unset.
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
    tracesSampleRate: environment === "production" ? 0.1 : 1.0,
    sendDefaultPii: false,
    // Same PII/secret filter as the server config (the proxy runs here).
    beforeSend: scrubEvent,
  });
}
