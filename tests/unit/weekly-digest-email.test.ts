import { describe, it, expect, vi, beforeEach } from "vitest";

const testEnv = vi.hoisted(() => ({
  NEXT_PUBLIC_APP_URL: "https://launchpad.example",
  RESEND_FROM_EMAIL: "Launchpad <hello@launchpad.example>",
  RESEND_API_KEY: "re_test_key" as string | undefined,
  CRON_SECRET: "cron-secret-for-tests-1234",
  GRADE_WORKER_SECRET: "test-grade-worker-secret-at-least-32-chars-long",
  EMAIL_UNSUBSCRIBE_SECRET: undefined as string | undefined,
}));
const resendSend = vi.hoisted(() => vi.fn());
const fakeDb = await vi.hoisted(async () => (await import("../helpers/fake-db")).createFakeDb());

vi.mock("@/env", () => ({ env: testEnv }));
vi.mock("@/db", () => ({ db: fakeDb.db }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: resendSend };
  },
}));

import { GET } from "@/app/api/cron/weekly-digest/route";
import { renderWeeklyDigest } from "@/lib/email/templates/weekly-digest";
import { renderWelcome } from "@/lib/email/templates/welcome";
import { unsubscribeLinks, verifyUnsubscribeToken } from "@/lib/email/unsubscribe";

const ALICE = "11111111-1111-4111-8111-111111111111";
const BOB = "22222222-2222-4222-8222-222222222222";

const DIGEST = {
  firstName: "Alice",
  activeDays: 3,
  currentStreak: 2,
  longestStreak: 2,
  lessonsCompletedThisWeek: 1,
  lessonsCompletedTotal: 4,
  nextLessonSlug: "raid-logs",
  nextLessonTitle: "RAID Logs",
  nextLessonNumber: 20,
  unsubscribeUrl: "https://launchpad.example/unsubscribe?token=tok.sig",
};

function cronRequest() {
  return new Request("https://launchpad.example/api/cron/weekly-digest", {
    headers: { authorization: "Bearer cron-secret-for-tests-1234" },
  });
}

beforeEach(() => {
  resendSend.mockReset().mockResolvedValue({ data: { id: "email_1" }, error: null });
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  fakeDb.reset((q) => {
    if (q.op === "select" && q.table === "profiles") {
      return [
        { id: ALICE, email: "alice@example.com", full_name: "Alice A", weekly_digest_opt_in: true },
        { id: BOB, email: "bob@example.com", full_name: "Bob B", weekly_digest_opt_in: false },
      ];
    }
    if (q.op === "execute") return { rows: [{ streak: 2 }] };
    return [];
  });
});

describe("weekly digest template", () => {
  it("puts the unsubscribe link in the HTML footer", () => {
    const { html } = renderWeeklyDigest(DIGEST);
    expect(html).toContain('href="https://launchpad.example/unsubscribe?token=tok.sig"');
    expect(html).toContain(">Unsubscribe</a>");
  });

  it("puts the unsubscribe link in the plain-text version", () => {
    const { text } = renderWeeklyDigest(DIGEST);
    expect(text).toContain(
      "Unsubscribe from this weekly email: https://launchpad.example/unsubscribe?token=tok.sig"
    );
  });

  it("does not add an unsubscribe link to one-off account emails", () => {
    const { html, text } = renderWelcome({ firstName: "Alice" });
    expect(html).not.toContain("Unsubscribe");
    expect(text).not.toContain("Unsubscribe");
  });
});

describe("weekly digest cron", () => {
  it("sends each opted-in learner their own unsubscribe link and List-Unsubscribe headers", async () => {
    const res = await GET(cronRequest());

    expect(await res.json()).toMatchObject({ audience: 1, sent: 1, failed: 0 });
    expect(resendSend).toHaveBeenCalledTimes(1);

    const message = resendSend.mock.calls[0][0];
    const links = unsubscribeLinks(ALICE);
    expect(message.to).toEqual(["Alice A <alice@example.com>"]);
    expect(message.headers).toEqual({
      "List-Unsubscribe": `<${links.oneClickUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
    expect(message.html).toContain(links.pageUrl.replace(/&/g, "&amp;"));
    expect(message.text).toContain(links.pageUrl);

    // The link in the email really does identify this learner.
    const token = new URL(links.oneClickUrl).searchParams.get("token");
    expect(verifyUnsubscribeToken(token)).toBe(ALICE);
  });

  it("does not email a learner who has unsubscribed", async () => {
    await GET(cronRequest());

    const recipients = resendSend.mock.calls.map((c) => c[0].to[0]);
    expect(recipients).not.toContain("Bob B <bob@example.com>");
  });

  it("refuses to run without the cron secret", async () => {
    const res = await GET(new Request("https://launchpad.example/api/cron/weekly-digest"));

    expect(res.status).toBe(401);
    expect(resendSend).not.toHaveBeenCalled();
  });
});
