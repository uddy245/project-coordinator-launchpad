import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {};

// withSentryConfig adds source-map upload + tunnel-route + ad-blocker bypass.
// All Sentry-uploader options are no-ops when SENTRY_AUTH_TOKEN is unset
// (i.e. local dev never tries to upload maps).
export default withSentryConfig(nextConfig, {
  // The Sentry org / project — set via env when available, otherwise the
  // build-time wrapper just disables source-map upload silently.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Suppress source-map upload chatter unless explicitly opted in.
  silent: !process.env.SENTRY_AUTH_TOKEN,

  // Upload a wider net of source maps in production builds.
  widenClientFileUpload: true,

  // Route Sentry events through a same-origin tunnel to dodge ad blockers.
  tunnelRoute: "/monitoring",

  // Strip the Sentry SDK's logger calls in production for smaller bundles.
  disableLogger: true,
});
