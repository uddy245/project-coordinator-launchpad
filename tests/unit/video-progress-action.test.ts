import { describe, it, expect, vi, beforeEach } from "vitest";

const { getAppUserMock, hasAccessMock, revalidatePathMock } = vi.hoisted(() => ({
  getAppUserMock: vi.fn(),
  hasAccessMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));
const fakeDb = await vi.hoisted(async () => (await import("../helpers/fake-db")).createFakeDb());

vi.mock("@/db", () => ({ db: fakeDb.db }));
vi.mock("@/lib/auth/session", () => ({
  getAppUser: getAppUserMock,
  hasAccess: hasAccessMock,
}));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));

import { updateVideoProgress } from "@/actions/video-progress";

function user(id = "u1") {
  return { id, email: `${id}@example.com`, name: null, neonAuthUserId: `neon-${id}` };
}

/** lessons select returns `lesson` (or nothing); upsert returns `upsert`. */
function withDb(lesson: { id: string } | null, upsert: unknown = []) {
  fakeDb.reset((q) => {
    if (q.op === "select" && q.table === "lessons") return lesson ? [lesson] : [];
    if (q.op === "insert" && q.table === "lesson_progress") return upsert;
    return [];
  });
}

beforeEach(() => {
  getAppUserMock.mockReset();
  hasAccessMock.mockReset().mockResolvedValue(true);
  revalidatePathMock.mockReset();
  withDb({ id: "lesson-1" });
});

describe("updateVideoProgress", () => {
  it("returns UNAUTHENTICATED when no user", async () => {
    getAppUserMock.mockResolvedValue(null);
    const result = await updateVideoProgress({ lessonSlug: "raid-logs", seconds: 10 });
    expect(result).toMatchObject({ ok: false, code: "UNAUTHENTICATED" });
    expect(fakeDb.calls).toHaveLength(0);
  });

  it("returns NOT_FOUND for unknown lesson slug", async () => {
    getAppUserMock.mockResolvedValue(user());
    withDb(null);
    const result = await updateVideoProgress({ lessonSlug: "nope", seconds: 10 });
    expect(result).toMatchObject({ ok: false, code: "NOT_FOUND" });
    expect(fakeDb.callsFor("insert")).toHaveLength(0);
  });

  it("returns NOT_FOUND when the user has no access (was RLS)", async () => {
    getAppUserMock.mockResolvedValue(user());
    hasAccessMock.mockResolvedValue(false);
    const result = await updateVideoProgress({ lessonSlug: "raid-logs", seconds: 10 });
    expect(result).toMatchObject({ ok: false, code: "NOT_FOUND" });
    expect(hasAccessMock).toHaveBeenCalledWith("u1");
    expect(fakeDb.callsFor("insert")).toHaveLength(0);
  });

  it("flips video_watched true at >=90% of duration", async () => {
    getAppUserMock.mockResolvedValue(user());

    const result = await updateVideoProgress({
      lessonSlug: "raid-logs",
      seconds: 540,
      duration: 600,
    });

    expect(result).toEqual({ ok: true, data: { video_watched: true } });
    const [insert] = fakeDb.callsFor("insert", "lesson_progress");
    expect(insert.values).toEqual({
      userId: "u1",
      lessonId: "lesson-1",
      videoSecondsWatched: 540,
      videoDuration: 600,
      videoWatched: true,
    });
    // Upsert on the (user_id, lesson_id) PK.
    expect(insert.chain).toContain("onConflictDoUpdate");
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
  });

  it("keeps video_watched false below 90% threshold", async () => {
    getAppUserMock.mockResolvedValue(user());

    const result = await updateVideoProgress({
      lessonSlug: "raid-logs",
      seconds: 300,
      duration: 600,
    });

    expect(result).toEqual({ ok: true, data: { video_watched: false } });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("keeps video_watched false when duration is unknown", async () => {
    getAppUserMock.mockResolvedValue(user());

    const result = await updateVideoProgress({
      lessonSlug: "raid-logs",
      seconds: 9999,
    });

    expect(result).toEqual({ ok: true, data: { video_watched: false } });
    expect(fakeDb.callsFor("insert", "lesson_progress")[0].values).toMatchObject({
      videoDuration: null,
      videoWatched: false,
    });
  });

  // The conflict-target/WHERE ownership is covered by
  // tests/integration/neon-smoke.test.ts; here we check the written userId.
  it("writes user_id from session, not from input", async () => {
    getAppUserMock.mockResolvedValue(user("authed-user"));

    await updateVideoProgress({ lessonSlug: "raid-logs", seconds: 10 });

    expect(fakeDb.callsFor("insert", "lesson_progress")[0].values).toMatchObject({
      userId: "authed-user",
    });
  });

  it("maps DB errors to DB_ERROR", async () => {
    getAppUserMock.mockResolvedValue(user());
    withDb({ id: "lesson-1" }, new Error("constraint violation"));
    const result = await updateVideoProgress({ lessonSlug: "raid-logs", seconds: 10 });
    expect(result).toMatchObject({ ok: false, code: "DB_ERROR", error: "constraint violation" });
  });
});
