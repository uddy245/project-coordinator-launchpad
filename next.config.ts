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

  // Pin the release name so source maps line up across server + client.
  // Vercel sets VERCEL_GIT_COMMIT_SHA on every build; without it (local /
  // unconfigured CI), the wrapper falls back to its own auto-detection.
  release: {
    name: process.env.VERCEL_GIT_COMMIT_SHA,
    create: !!process.env.SENTRY_AUTH_TOKEN,
    finalize: !!process.env.SENTRY_AUTH_TOKEN,
  },

  // Source map upload defaults — only attempt when an auth token is set.
  // The wrapper otherwise silently no-ops.
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
});
