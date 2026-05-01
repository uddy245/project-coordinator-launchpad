"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Top-level error boundary. Required by Next.js to satisfy Sentry's root
 * error capture path. Shows a calm, branded fallback rather than the
 * default Next.js stack trace.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "#ffffff",
          color: "#11161e",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 520, width: "100%" }}>
          <p
            style={{
              fontFamily:
                "'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace",
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#6a7385",
              margin: 0,
            }}
          >
            Launchpad · Error
          </p>
          <h1
            style={{
              fontFamily: "'IBM Plex Serif', Georgia, serif",
              fontSize: 32,
              lineHeight: 1.15,
              fontWeight: 600,
              margin: "12px 0 16px",
              letterSpacing: "-0.01em",
            }}
          >
            Something went wrong on our side.
          </h1>
          <p
            style={{
              fontSize: 16,
              lineHeight: 1.6,
              color: "#2c3340",
              margin: "0 0 24px",
            }}
          >
            The error has been logged and we&apos;ll look into it. Try reloading
            the page — if the problem persists, sign back in or open the
            dashboard fresh.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              onClick={() => reset()}
              style={{
                background: "#11161e",
                color: "#ffffff",
                border: 0,
                padding: "12px 24px",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <a
              href="/dashboard"
              style={{
                background: "#ffffff",
                color: "#11161e",
                border: "1px solid #d9dde4",
                padding: "12px 24px",
                fontSize: 14,
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Open dashboard
            </a>
          </div>
          {error.digest ? (
            <p
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11,
                color: "#6a7385",
                marginTop: 32,
                letterSpacing: "0.04em",
              }}
            >
              ref: {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
