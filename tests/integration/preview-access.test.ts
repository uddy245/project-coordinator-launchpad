/**
 * The paid-access check must not block free preview lessons
 * (lessons.is_preview = true) — the old RLS policy let everyone read them.
 *
 * An UNPAID learner (profiles.has_access = false) can use a preview lesson's
 * video, quiz and artifact submission, but is refused on a paid lesson; a
 * PAID learner can use both; unpublished drafts stay admin-only.
 *
 * Runs against the local replica (TEST_DATABASE_URL); tests/db/seed.sql has
 * `coordinator-role` (preview), `project-lifecycle` (paid) and
 * `unpublished-draft`.
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect, afterAll, beforeAll, beforeEach, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";

const session = vi.hoisted(() => ({ userId: "" }));

vi.mock("@/lib/auth/session", async (orig) => {
  const real = await orig<typeof import("@/lib/auth/session")>();
  return {
    ...real,
    getAppUser: async () =>
      session.userId
        ? { id: session.userId, email: "x@launchpad.test", name: null, neonAuthUserId: "n" }
        : null,
  };
});
vi.mock("@/lib/auth/neon", () => ({ neonAuth: () => ({}) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/storage/r2", () => ({
  uploadObject: vi.fn(async () => ({ error: null })),
  removeObjects: vi.fn(async () => ({ error: null })),
  createSignedUrl: vi.fn(async () => null),
}));

const DB_AVAILABLE = !!process.env.TEST_DATABASE_URL;

describe.skipIf(!DB_AVAILABLE)("free preview lessons vs the paid-access check", async () => {
  const { db } = await import("@/db");
  const { lessons, profiles, quizItems, submissions, usersInAuth } = await import("@/db/schema");
  const { canViewLesson, visibleLessonsFilter } = await import("@/lib/lessons/access");
  const { updateVideoProgress } = await import("@/actions/video-progress");
  const { submitQuizAttempt } = await import("@/actions/quiz");
  const { createSubmission } = await import("@/actions/submission");

  const unpaid = randomUUID();
  const paid = randomUUID();
  const admin = randomUUID();
  const ids = [unpaid, paid, admin];
  const docx = () => readFileSync(resolve(__dirname, "../fixtures/sample.docx")).toString("base64");
  const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  async function lesson(slug: string) {
    const [row] = await db
      .select({ id: lessons.id, isPublished: lessons.isPublished, isPreview: lessons.isPreview })
      .from(lessons)
      .where(eq(lessons.slug, slug));
    return row;
  }

  beforeAll(async () => {
    // The live on_auth_user_created trigger creates each profile.
    for (const id of ids) {
      await db.insert(usersInAuth).values({ id, email: `preview-${id}@launchpad.test` });
    }
    await db.update(profiles).set({ hasAccess: false }).where(eq(profiles.id, unpaid));
    await db.update(profiles).set({ hasAccess: true }).where(eq(profiles.id, paid));
    await db
      .update(profiles)
      .set({ hasAccess: false, role: "admin" })
      .where(eq(profiles.id, admin));
  });

  afterAll(async () => {
    await db.delete(usersInAuth).where(inArray(usersInAuth.id, ids));
  });

  beforeEach(() => {
    session.userId = unpaid;
    // Grading worker is fire-and-forget over HTTP; never leave the test.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 202 }))
    );
  });

  it("canViewLesson: preview for everyone, paid lessons need access, drafts admin-only", async () => {
    const preview = await lesson("coordinator-role");
    const paidLesson = await lesson("project-lifecycle");
    const draft = await lesson("unpublished-draft");

    expect(await canViewLesson(unpaid, preview)).toBe(true);
    expect(await canViewLesson(unpaid, paidLesson)).toBe(false);
    expect(await canViewLesson(paid, paidLesson)).toBe(true);
    expect(await canViewLesson(paid, draft)).toBe(false);
    expect(await canViewLesson(admin, draft)).toBe(true);
  });

  it("list filter (search/portfolio): unpaid learners see only published previews", async () => {
    const slugsFor = async (userId: string) =>
      (
        await db
          .select({ slug: lessons.slug })
          .from(lessons)
          .where(await visibleLessonsFilter(userId))
      )
        .map((r) => r.slug)
        .sort();

    expect(await slugsFor(unpaid)).toEqual(["coordinator-role"]);
    expect(await slugsFor(paid)).toEqual(["coordinator-role", "project-lifecycle", "raid-logs"]);
    expect(await slugsFor(admin)).toContain("unpublished-draft");
  });

  it("unpaid learner can record video progress on a preview lesson, not a paid one", async () => {
    expect(
      await updateVideoProgress({ lessonSlug: "coordinator-role", seconds: 540, duration: 600 })
    ).toEqual({ ok: true, data: { video_watched: true } });
    expect(
      await updateVideoProgress({ lessonSlug: "project-lifecycle", seconds: 10 })
    ).toMatchObject({ ok: false, code: "NOT_FOUND" });
  });

  it("unpaid learner can take a preview lesson's quiz, not a paid one's", async () => {
    const preview = await lesson("coordinator-role");
    const [item] = await db
      .select({ id: quizItems.id })
      .from(quizItems)
      .where(eq(quizItems.lessonId, preview.id))
      .limit(1);

    const res = await submitQuizAttempt({
      lessonSlug: "coordinator-role",
      answers: [{ itemId: item.id, choice: "a" }],
    });
    expect(res.ok).toBe(true);

    expect(
      await submitQuizAttempt({
        lessonSlug: "project-lifecycle",
        answers: [{ itemId: item.id, choice: "a" }],
      })
    ).toMatchObject({ ok: false, code: "NOT_FOUND" });
  });

  it("unpaid learner can submit an artifact for a preview lesson, not a paid one", async () => {
    const ok = await createSubmission({
      lessonSlug: "coordinator-role",
      filename: "memo.docx",
      mimeType: DOCX,
      fileBase64: docx(),
    });
    expect(ok.ok).toBe(true);

    expect(
      await createSubmission({
        lessonSlug: "project-lifecycle",
        filename: "memo.docx",
        mimeType: DOCX,
        fileBase64: docx(),
      })
    ).toMatchObject({ ok: false, code: "NOT_FOUND" });
  });

  it("a paid learner can use the paid lesson", async () => {
    session.userId = paid;
    expect(
      await updateVideoProgress({ lessonSlug: "project-lifecycle", seconds: 10, duration: 600 })
    ).toEqual({ ok: true, data: { video_watched: false } });
  });
});
