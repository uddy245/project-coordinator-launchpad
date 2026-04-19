import { describe, it, expect, vi, beforeEach } from "vitest";

const { getUserMock, submissionMaybeSingleMock, queueInsertMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  submissionMaybeSingleMock: vi.fn(),
  queueInsertMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: getUserMock },
    from: (table: string) => {
      if (table === "submissions") {
        return {
          select: () => ({ eq: () => ({ maybeSingle: submissionMaybeSingleMock }) }),
        };
      }
      throw new Error("unexpected table on user client: " + table);
    },
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "audit_queue") {
        return { insert: queueInsertMock };
      }
      throw new Error("unexpected admin table: " + table);
    },
  }),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { requestReview } from "@/actions/audit";

beforeEach(() => {
  getUserMock.mockReset();
  submissionMaybeSingleMock.mockReset();
  queueInsertMock.mockReset();
});

describe("requestReview", () => {
  it("rejects unauthenticated callers", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null } });
    const r = await requestReview("sub-1");
    expect(r).toEqual({ ok: false, error: "Not signed in.", code: "UNAUTHENTICATED" });
  });

  it("returns NOT_FOUND when RLS hides the submission", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: { id: "u1" } } });
    submissionMaybeSingleMock.mockResolvedValueOnce({ data: null });
    const r = await requestReview("sub-missing");
    expect(r).toEqual({ ok: false, error: "Submission not found.", code: "NOT_FOUND" });
  });

  it("refuses when the submission is not yet graded", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: { id: "u1" } } });
    submissionMaybeSingleMock.mockResolvedValueOnce({ data: { id: "sub-1", status: "grading" } });
    const r = await requestReview("sub-1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("NOT_ELIGIBLE");
  });

  it("inserts into audit_queue with reason=requested on success", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: { id: "u1" } } });
    submissionMaybeSingleMock.mockResolvedValueOnce({ data: { id: "sub-1", status: "graded" } });
    queueInsertMock.mockResolvedValueOnce({ error: null });

    const r = await requestReview("sub-1");
    expect(r).toEqual({ ok: true, data: undefined });
    expect(queueInsertMock).toHaveBeenCalledWith({
      submission_id: "sub-1",
      reason: "requested",
    });
  });

  it("treats a unique-violation (already queued) as success", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: { id: "u1" } } });
    submissionMaybeSingleMock.mockResolvedValueOnce({ data: { id: "sub-1", status: "graded" } });
    queueInsertMock.mockResolvedValueOnce({ error: { code: "23505", message: "duplicate" } });

    const r = await requestReview("sub-1");
    expect(r).toEqual({ ok: true, data: undefined });
  });

  it("surfaces unexpected DB errors", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: { id: "u1" } } });
    submissionMaybeSingleMock.mockResolvedValueOnce({ data: { id: "sub-1", status: "graded" } });
    queueInsertMock.mockResolvedValueOnce({ error: { code: "XXXXX", message: "boom" } });

    const r = await requestReview("sub-1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("DB_ERROR");
  });
});
