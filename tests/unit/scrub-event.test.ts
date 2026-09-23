import { describe, it, expect } from "vitest";
import type { ErrorEvent } from "@sentry/nextjs";
import { scrubEvent, scrubValue } from "@/lib/observability/scrub-event";

const SECRET = "hunter2-Sup3rS3cret";

describe("Sentry scrubEvent — passwords and codes never leave the process", () => {
  it("drops the request body of a server-action POST entirely", () => {
    const event = {
      type: undefined,
      request: {
        url: "https://app.example/login",
        method: "POST",
        data: JSON.stringify([{ email: "a@b.co", password: SECRET }]),
        headers: { cookie: "session=abc", "next-action": "40abc" },
        cookies: { session: "abc" },
      },
    } as unknown as ErrorEvent;

    const out = scrubEvent(event);
    expect(out.request?.data).toBeUndefined();
    expect(out.request?.headers).toEqual({});
    expect(out.request?.cookies).toEqual({});
    expect(JSON.stringify(out)).not.toContain(SECRET);
  });

  it("redacts sensitive keys at any depth in breadcrumbs, extra and contexts", () => {
    const event = {
      type: undefined,
      breadcrumbs: [
        { message: "sign-in", data: { input: [{ email: "x@y.io", password: SECRET }] } },
      ],
      extra: {
        args: { newPassword: SECRET, otp: "123456", code: "654321", nested: { token: SECRET } },
      },
      contexts: { form: { pwd: SECRET, api_key: SECRET } },
    } as unknown as ErrorEvent;

    const json = JSON.stringify(scrubEvent(event));
    expect(json).not.toContain(SECRET);
    expect(json).not.toContain("123456");
    expect(json).not.toContain("654321");
    expect(json).not.toContain("x@y.io");
    expect(json).toContain("[redacted]");
  });

  it("keeps non-sensitive diagnostic data", () => {
    expect(scrubValue({ lessonSlug: "raid-logs", status: 500 })).toEqual({
      lessonSlug: "raid-logs",
      status: 500,
    });
  });

  it("keeps only the user id", () => {
    const out = scrubEvent({
      type: undefined,
      user: { id: "u1", email: "a@b.co", ip_address: "1.2.3.4" },
    } as unknown as ErrorEvent);
    expect(out.user).toEqual({ id: "u1" });
  });
});
