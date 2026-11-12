import { describe, it, expect, vi, beforeEach } from "vitest";

const testEnv = vi.hoisted(() => ({
  GRADE_WORKER_SECRET: "test-grade-worker-secret-at-least-32-chars-long",
  EMAIL_UNSUBSCRIBE_SECRET: undefined as string | undefined,
  NEXT_PUBLIC_APP_URL: "https://launchpad.example/",
}));
const fakeDb = await vi.hoisted(async () => (await import("../helpers/fake-db")).createFakeDb());

vi.mock("@/env", () => ({ env: testEnv }));
vi.mock("@/db", () => ({ db: fakeDb.db }));

import {
  createUnsubscribeToken,
  unsubscribeLinks,
  unsubscribeWeeklyDigest,
  verifyUnsubscribeToken,
} from "@/lib/email/unsubscribe";

const ALICE = "11111111-1111-4111-8111-111111111111";
const BOB = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  testEnv.GRADE_WORKER_SECRET = "test-grade-worker-secret-at-least-32-chars-long";
  testEnv.EMAIL_UNSUBSCRIBE_SECRET = undefined;
  fakeDb.reset((q) => (q.op === "update" && q.table === "profiles" ? [{ id: ALICE }] : []));
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("unsubscribe token", () => {
  it("round-trips the user id", () => {
    expect(verifyUnsubscribeToken(createUnsubscribeToken(ALICE))).toBe(ALICE);
  });

  it("is stable, so a link in an old email keeps working", () => {
    expect(createUnsubscribeToken(ALICE)).toBe(createUnsubscribeToken(ALICE));
  });

  it("does not contain the signing secret or the raw user id", () => {
    const token = createUnsubscribeToken(ALICE);
    expect(token).not.toContain(testEnv.GRADE_WORKER_SECRET);
    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  });

  it("rejects one user's signature on another user's id", () => {
    const [, aliceSig] = createUnsubscribeToken(ALICE).split(".");
    const [bobId] = createUnsubscribeToken(BOB).split(".");
    expect(verifyUnsubscribeToken(`${bobId}.${aliceSig}`)).toBeNull();
  });

  it("rejects a tampered signature", () => {
    const token = createUnsubscribeToken(ALICE);
    const flipped = token.slice(0, -1) + (token.endsWith("A") ? "B" : "A");
    expect(verifyUnsubscribeToken(flipped)).toBeNull();
  });

  it.each([
    undefined,
    null,
    "",
    "nonsense",
    "a.b.c",
    ".",
    "x".repeat(500),
    `${Buffer.from("not-a-uuid").toString("base64url")}.AAAA`,
  ])("rejects a missing or malformed token (%s)", (token) => {
    expect(verifyUnsubscribeToken(token)).toBeNull();
  });

  it("rejects a token signed with a different secret", () => {
    const token = createUnsubscribeToken(ALICE);
    testEnv.GRADE_WORKER_SECRET = "a-completely-different-secret-of-32-chars!!";
    expect(verifyUnsubscribeToken(token)).toBeNull();
  });

  it("uses EMAIL_UNSUBSCRIBE_SECRET when it is set", () => {
    const derived = createUnsubscribeToken(ALICE);
    testEnv.EMAIL_UNSUBSCRIBE_SECRET = "dedicated-unsubscribe-secret-32-chars-xx";
    const dedicated = createUnsubscribeToken(ALICE);

    expect(dedicated).not.toBe(derived);
    expect(verifyUnsubscribeToken(dedicated)).toBe(ALICE);
    expect(verifyUnsubscribeToken(derived)).toBeNull();
  });
});

describe("unsubscribeLinks", () => {
  it("builds the page link, the one-click link and the RFC 8058 headers", () => {
    const links = unsubscribeLinks(ALICE);
    const token = encodeURIComponent(createUnsubscribeToken(ALICE));

    expect(links.pageUrl).toBe(`https://launchpad.example/unsubscribe?token=${token}`);
    expect(links.oneClickUrl).toBe(
      `https://launchpad.example/api/email/unsubscribe?token=${token}`
    );
    expect(links.headers).toEqual({
      "List-Unsubscribe": `<${links.oneClickUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
  });

  it("gives each learner a different link", () => {
    expect(unsubscribeLinks(ALICE).oneClickUrl).not.toBe(unsubscribeLinks(BOB).oneClickUrl);
  });
});

describe("unsubscribeWeeklyDigest", () => {
  it("switches the weekly email off, and nothing else", async () => {
    expect(await unsubscribeWeeklyDigest(createUnsubscribeToken(ALICE))).toBe("unsubscribed");

    const updates = fakeDb.callsFor("update", "profiles");
    expect(updates).toHaveLength(1);
    expect(updates[0].set).toEqual({ weeklyDigestOptIn: false });
    expect(updates[0].chain).toContain("where");
  });

  it("does not touch the database for an invalid token", async () => {
    expect(await unsubscribeWeeklyDigest("nonsense")).toBe("invalid");
    expect(fakeDb.calls).toHaveLength(0);
  });

  it("reports invalid when the account no longer exists", async () => {
    fakeDb.setHandler(() => []);
    expect(await unsubscribeWeeklyDigest(createUnsubscribeToken(ALICE))).toBe("invalid");
  });

  it("reports error, without throwing, when the database fails", async () => {
    fakeDb.setHandler(() => new Error("connection lost"));
    expect(await unsubscribeWeeklyDigest(createUnsubscribeToken(ALICE))).toBe("error");
  });
});
