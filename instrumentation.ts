/**
 * Next.js instrumentation entry.
 *
 * Called once per runtime at startup. Loads the right Sentry config
 * based on whether we're in the Node server runtime or the Edge runtime.
 *
 * The async dynamic import keeps Sentry out of the runtime bundle when
 * the config is unused, and avoids loading edge code into Node.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Required by Sentry — let it hook into Next.js request error reporting.
export { captureRequestError as onRequestError } from "@sentry/nextjs";
