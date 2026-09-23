import { describe, it, expect, vi, beforeEach } from "vitest";

const { getAppUserMock, isAdminMock } = vi.hoisted(() => ({
  getAppUserMock: vi.fn(),
  isAdminMock: vi.fn(),
}));
const fakeDb = await vi.hoisted(async () => (await import("../helpers/fake-db")).createFakeDb());

vi.mock("@/db", () => ({ db: fakeDb.db }));
vi.mock("@/lib/auth/session", () => ({ getAppUser: getAppUserMock, isAdmin: isAdminMock }));
vi.mock("@/lib/email/notify-audit", () => ({ notifyAuditDecision: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { requestReview } from "@/actions/audit";

const SUB_ID = "11111111-2222-4333-8444-555555555555";
const USER = { id: "u1", email: "u1@example.com", name: null, neonAuthUserId: "n1" };

/**
 * submissions select returns `submission` (the owner-scoped lookup — a
 * non-owner's id reads as no row); audit_queue insert returns `queueInsert`.
 */
function withDb(submission: { id: string; status: string } | null, queueInsert: unknown = []) {
  fakeDb.reset((q) => {
    if (q.op === "select" && q.table === "submissions") return submission ? [submission] : [];
    if (q.op === "insert" && q.table === "audit_queue") return queueInsert;
    return [];
  });
}

beforeEach(() => {
  getAppUserMock.mockReset();
  isAdminMock.mockReset();
  withDb(null);
});

describe("requestReview", () => {
  it("rejects unauthenticated callers", async () => {
    getAppUserMock.mockResolvedValueOnce(null);
    const r = await requestReview(SUB_ID);
    expect(r).toEqual({ ok: false, error: "Not signed in.", code: "UNAUTHENTICATED" });
    expect(fakeDb.calls).toHaveLength(0);
  });

  it("returns NOT_FOUND for a malformed id without querying", async () => {
    getAppUserMock.mockResolvedValueOnce(USER);
    const r = await requestReview("sub-1");
    expect(r).toEqual({ ok: false, error: "Submission not found.", code: "NOT_FOUND" });
    expect(fakeDb.calls).toHaveLength(0);
  });

  // The owner filter itself (user_id = session user) is in the WHERE clause,
  // covered by tests/integration/neon-smoke.test.ts.
  it("returns NOT_FOUND when the submission is missing or not the user's", async () => {
    getAppUserMock.mockResolvedValueOnce(USER);
    withDb(null);
    const r = await requestReview(SUB_ID);
    expect(r).toEqual({ ok: false, error: "Submission not found.", code: "NOT_FOUND" });
    expect(fakeDb.callsFor("insert")).toHaveLength(0);
  });

  it("refuses when the submission is not yet graded", async () => {
    getAppUserMock.mockResolvedValueOnce(USER);
    withDb({ id: SUB_ID, status: "grading" });
    const r = await requestReview(SUB_ID);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("NOT_ELIGIBLE");
    expect(fakeDb.callsFor("insert")).toHaveLength(0);
  });

  it("inserts into audit_queue with reason=requested on success", async () => {
    getAppUserMock.mockResolvedValueOnce(USER);
    withDb({ id: SUB_ID, status: "graded" });

    const r = await requestReview(SUB_ID);
    expect(r).toEqual({ ok: true, data: undefined });
    const [insert] = fakeDb.callsFor("insert", "audit_queue");
    expect(insert.values).toEqual({ submissionId: SUB_ID, reason: "requested" });
  });

  it("treats an already-queued submission as success (ON CONFLICT DO NOTHING)", async () => {
    getAppUserMock.mockResolvedValueOnce(USER);
    // Conflict → no row returned; still success.
    withDb({ id: SUB_ID, status: "graded" }, []);

    const r = await requestReview(SUB_ID);
    expect(r).toEqual({ ok: true, data: undefined });
    expect(fakeDb.callsFor("insert", "audit_queue")[0].chain).toContain("onConflictDoNothing");
  });

  it("surfaces unexpected DB errors", async () => {
    getAppUserMock.mockResolvedValueOnce(USER);
    withDb({ id: SUB_ID, status: "graded" }, new Error("boom"));

    const r = await requestReview(SUB_ID);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("DB_ERROR");
      expect(r.error).toBe("boom");
    }
  });
});
