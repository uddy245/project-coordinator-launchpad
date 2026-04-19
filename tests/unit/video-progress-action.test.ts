import { describe, it, expect, vi, beforeEach } from "vitest";

const { getUserMock, lessonSingleMock, upsertMock, fromMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  lessonSingleMock: vi.fn(),
  upsertMock: vi.fn(),
  fromMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: getUserMock },
    from: fromMock,
  }),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { updateVideoProgress } from "@/actions/video-progress";

beforeEach(() => {
  getUserMock.mockReset();
  lessonSingleMock.mockReset();
  upsertMock.mockReset();
  fromMock.mockReset();

  fromMock.mockImplementation((table: string) => {
    if (table === "lessons") {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({ maybeSingle: lessonSingleMock }),
          }),
        }),
      };
    }
    if (table === "lesson_progress") {
      return { upsert: upsertMock };
    }
    throw new Error("unexpected table: " + table);
  });
});

describe("updateVideoProgress", () => {
  it("returns UNAUTHENTICATED when no user", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const result = await updateVideoProgress({ lessonSlug: "raid-logs", seconds: 10 });
    expect(result).toMatchObject({ ok: false, code: "UNAUTHENTICATED" });
  });

  it("returns NOT_FOUND for unknown lesson slug", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    lessonSingleMock.mockResolvedValue({ data: null });
    const result = await updateVideoProgress({ lessonSlug: "nope", seconds: 10 });
    expect(result).toMatchObject({ ok: false, code: "NOT_FOUND" });
  });

  it("flips video_watched true at >=90% of duration", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    lessonSingleMock.mockResolvedValue({ data: { id: "lesson-1" } });
    upsertMock.mockResolvedValue({ error: null });

    const result = await updateVideoProgress({
      lessonSlug: "raid-logs",
      seconds: 540,
      duration: 600,
    });

    expect(result).toEqual({ ok: true, data: { video_watched: true } });
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "u1",
        lesson_id: "lesson-1",
        video_seconds_watched: 540,
        video_duration: 600,
        video_watched: true,
      }),
      { onConflict: "user_id,lesson_id" }
    );
  });

  it("keeps video_watched false below 90% threshold", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    lessonSingleMock.mockResolvedValue({ data: { id: "lesson-1" } });
    upsertMock.mockResolvedValue({ error: null });

    const result = await updateVideoProgress({
      lessonSlug: "raid-logs",
      seconds: 300,
      duration: 600,
    });

    expect(result).toEqual({ ok: true, data: { video_watched: false } });
  });

  it("keeps video_watched false when duration is unknown", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    lessonSingleMock.mockResolvedValue({ data: { id: "lesson-1" } });
    upsertMock.mockResolvedValue({ error: null });

    const result = await updateVideoProgress({
      lessonSlug: "raid-logs",
      seconds: 9999,
    });

    expect(result).toEqual({ ok: true, data: { video_watched: false } });
  });

  it("writes user_id from session, not from input", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "authed-user" } } });
    lessonSingleMock.mockResolvedValue({ data: { id: "lesson-1" } });
    upsertMock.mockResolvedValue({ error: null });

    await updateVideoProgress({ lessonSlug: "raid-logs", seconds: 10 });

    expect(upsertMock.mock.calls[0]?.[0]).toMatchObject({ user_id: "authed-user" });
  });

  it("maps DB errors to DB_ERROR", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    lessonSingleMock.mockResolvedValue({ data: { id: "lesson-1" } });
    upsertMock.mockResolvedValue({ error: { message: "rls blocked" } });
    const result = await updateVideoProgress({ lessonSlug: "raid-logs", seconds: 10 });
    expect(result).toMatchObject({ ok: false, code: "DB_ERROR" });
  });
});
