import type { ErrorEvent } from "@sentry/nextjs";

/**
 * PII / secret filter for Sentry events (server + browser). Sentry is for
 * stack frames and call paths, not for replaying user data.
 *
 *  - user → id only
 *  - request body (`request.data`) dropped entirely: server-action POSTs are
 *    `[{ email, password, … }]` and must never leave the process
 *  - request headers/cookies dropped; URL + query string scrubbed
 *  - sensitive keys (password, token, code, otp, secret, …) redacted at any
 *    depth in breadcrumbs data, extra and contexts
 *  - emails / JWTs / Bearer tokens / API keys / card-like numbers masked in
 *    free text
 */
const SENSITIVE_KEY =
  /pass(word)?|pwd|secret|token|otp|^code$|authorization|cookie|api[-_]?key|session|credential/i;

export function scrubText(s: string | undefined): string | undefined {
  if (!s) return s;
  return s
    .replace(/[\w._%+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[email]")
    .replace(/\b\d{13,19}\b/g, "[number]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
    .replace(/\b(sk|pk)_(live|test)_[A-Za-z0-9]+/g, "$1_$2_[redacted]")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[jwt]");
}

export function scrubValue(v: unknown, depth = 0): unknown {
  if (depth > 8) return "[truncated]";
  if (typeof v === "string") return scrubText(v);
  if (Array.isArray(v)) return v.map((x) => scrubValue(x, depth + 1));
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v)) {
      out[k] = SENSITIVE_KEY.test(k) ? "[redacted]" : scrubValue(val, depth + 1);
    }
    return out;
  }
  return v;
}

export function scrubEvent<E extends ErrorEvent>(event: E): E {
  if (event.user) event.user = { id: event.user.id ?? "[redacted]" };
  if (event.message) event.message = scrubText(event.message);
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((b) => ({
      ...b,
      message: scrubText(b.message),
      data: b.data ? (scrubValue(b.data) as Record<string, unknown>) : b.data,
    }));
  }
  if (event.request) {
    delete event.request.data;
    if (event.request.headers) event.request.headers = {};
    if (event.request.cookies) event.request.cookies = {};
    if (event.request.url) event.request.url = scrubText(event.request.url);
    if (typeof event.request.query_string === "string") {
      event.request.query_string = scrubText(event.request.query_string);
    } else if (event.request.query_string) {
      event.request.query_string = "[redacted]";
    }
  }
  if (event.extra) event.extra = scrubValue(event.extra) as Record<string, unknown>;
  if (event.contexts) event.contexts = scrubValue(event.contexts) as typeof event.contexts;
  return event;
}
