import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  getAppUserMock,
  canViewLessonMock,
  uploadObjectMock,
  gradeSubmissionMock,
  extractTextMock,
} = vi.hoisted(() => ({
  getAppUserMock: vi.fn(),
  canViewLessonMock: vi.fn(),
  uploadObjectMock: vi.fn(),
  gradeSubmissionMock: vi.fn(),
  extractTextMock: vi.fn(),
}));
const fakeDb = await vi.hoisted(async () => (await import("../helpers/fake-db")).createFakeDb());

vi.mock("@/db", () => ({ db: fakeDb.db }));
vi.mock("@/lib/auth/session", () => ({
  getAppUser: getAppUserMock,
}));
vi.mock("@/lib/lessons/access", () => ({ canViewLesson: canViewLessonMock }));
vi.mock("@/lib/storage/object-storage", () => ({
  uploadObject: uploadObjectMock,
  removeObjects: vi.fn(async () => ({ error: null })),
  createSignedUrl: vi.fn(async () => null),
}));

vi.mock("@/lib/grading/service", () => ({
  gradeSubmission: gradeSubmissionMock,
}));

vi.mock("@/lib/grading/parsers", async () => {
  const real = (await vi.importActual(
    "@/lib/grading/parsers"
  )) as typeof import("@/lib/grading/parsers");
  return {
    ...real,
    extractText: extractTextMock,
  };
});

import { createSubmission } from "@/actions/submission";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const SMALL_BASE64 = Buffer.from("hello").toString("base64");

function user(id = "u1") {
  return { id, email: `${id}@example.com`, name: null, neonAuthUserId: `neon-${id}` };
}

/**
 * lessons select → `lesson`; submissions insert…returning → `inserted`.
 * Updates/deletes resolve to [] (or `writeResult` if given).
 */
function withDb(opts: {
  lesson?: { id: string } | null;
  inserted?: { id: string } | null | Error;
  writeResult?: unknown;
}) {
  const { lesson = { id: "lesson-1" }, inserted = { id: "sub-99" }, writeResult = [] } = opts;
  fakeDb.reset((q) => {
    if (q.op === "select" && q.table === "lessons") return lesson ? [lesson] : [];
    if (q.op === "insert" && q.table === "submissions") {
      return inserted instanceof Error ? inserted : inserted ? [inserted] : [];
    }
    if (q.op === "update" || q.op === "delete") return writeResult;
    return [];
  });
}

beforeEach(() => {
  getAppUserMock.mockReset();
  canViewLessonMock.mockReset().mockResolvedValue(true);
  uploadObjectMock.mockReset();
  gradeSubmissionMock.mockReset();
  extractTextMock.mockReset();
  withDb({});

  // Replace global fetch so the fire-and-forget grading dispatch is
  // captured but doesn't actually run (and doesn't need a network).
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(new Response(null, { status: 202 })))
  );
});

describe("createSubmission", () => {
  it("rejects unauthenticated calls", async () => {
    getAppUserMock.mockResolvedValue(null);
    const result = await createSubmission({
      lessonSlug: "raid-logs",
      filename: "x.xlsx",
      mimeType: XLSX_MIME,
      fileBase64: SMALL_BASE64,
    });
    expect(result).toMatchObject({ ok: false, code: "UNAUTHENTICATED" });
    expect(fakeDb.callsFor("insert")).toHaveLength(0);
  });

  it("rejects an unknown lesson slug", async () => {
    getAppUserMock.mockResolvedValue(user());
    withDb({ lesson: null });
    const result = await createSubmission({
      lessonSlug: "unknown",
      filename: "x.xlsx",
      mimeType: XLSX_MIME,
      fileBase64: SMALL_BASE64,
    });
    expect(result).toMatchObject({ ok: false, code: "NOT_FOUND" });
    expect(fakeDb.callsFor("insert")).toHaveLength(0);
  });

  it("rejects a lesson the user has no access to (was RLS)", async () => {
    getAppUserMock.mockResolvedValue(user());
    canViewLessonMock.mockResolvedValue(false);
    const result = await createSubmission({
      lessonSlug: "raid-logs",
      filename: "x.xlsx",
      mimeType: XLSX_MIME,
      fileBase64: SMALL_BASE64,
    });
    expect(result).toMatchObject({ ok: false, code: "NOT_FOUND" });
    expect(canViewLessonMock).toHaveBeenCalledWith("u1", expect.anything());
    expect(fakeDb.callsFor("insert")).toHaveLength(0);
  });

  it("rejects a file exceeding the 10MB cap", async () => {
    getAppUserMock.mockResolvedValue(user());
    // base64 is 4/3 the raw size, so build an 11MB raw buffer directly.
    const big = Buffer.alloc(11 * 1024 * 1024).toString("base64");
    const result = await createSubmission({
      lessonSlug: "raid-logs",
      filename: "big.xlsx",
      mimeType: XLSX_MIME,
      fileBase64: big,
    });
    expect(result).toMatchObject({ ok: false, code: "FILE_TOO_LARGE" });
  });

  it("rejects an unsupported MIME type at the schema layer", async () => {
    const result = await createSubmission({
      lessonSlug: "raid-logs",
      filename: "x.png",
      // @ts-expect-error testing schema rejection
      mimeType: "image/png",
      fileBase64: SMALL_BASE64,
    });
    expect(result).toMatchObject({ ok: false, code: "INVALID_INPUT" });
  });

  it("returns DB_ERROR when the insert fails", async () => {
    getAppUserMock.mockResolvedValue(user());
    withDb({ inserted: new Error("insert blew up") });
    const result = await createSubmission({
      lessonSlug: "raid-logs",
      filename: "my.xlsx",
      mimeType: XLSX_MIME,
      fileBase64: SMALL_BASE64,
    });
    expect(result).toMatchObject({ ok: false, code: "DB_ERROR", error: "insert blew up" });
    expect(uploadObjectMock).not.toHaveBeenCalled();
  });

  it("happy path: inserts, uploads, extracts, schedules grading", async () => {
    getAppUserMock.mockResolvedValue(user("user-42"));
    uploadObjectMock.mockResolvedValue({ error: null });
    extractTextMock.mockResolvedValue({
      ok: true,
      data: { text: "extracted", truncated: false },
    });
    gradeSubmissionMock.mockResolvedValue({ ok: true, data: { status: "graded" } });

    const result = await createSubmission({
      lessonSlug: "raid-logs",
      filename: "my.xlsx",
      mimeType: XLSX_MIME,
      fileBase64: SMALL_BASE64,
    });

    expect(result).toEqual({ ok: true, data: { submissionId: "sub-99" } });

    // user_id is bound to the session, never taken from input. (WHERE-level
    // ownership on the follow-up updates is covered by
    // tests/integration/neon-smoke.test.ts.)
    const [insert] = fakeDb.callsFor("insert", "submissions");
    expect(insert.values).toMatchObject({
      userId: "user-42",
      lessonId: "lesson-1",
      storagePath: "pending",
      originalFilename: "my.xlsx",
      mimeType: XLSX_MIME,
      sizeBytes: 5,
      status: "pending",
    });

    expect(uploadObjectMock).toHaveBeenCalledTimes(1);
    const [bucket, path, , contentType] = uploadObjectMock.mock.calls[0] ?? [];
    expect(bucket).toBe("submissions");
    expect(path).toBe("user-42/sub-99.xlsx");
    expect(contentType).toBe(XLSX_MIME);

    const updates = fakeDb.callsFor("update", "submissions");
    expect(updates).toHaveLength(1);
    expect(updates[0].set).toEqual({
      storagePath: "user-42/sub-99.xlsx",
      extractedText: "extracted",
    });

    // Grading is dispatched via fetch to /api/grade/[id] — verify the
    // fire-and-forget URL + shared secret header, not a direct call.
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/grade\/sub-99$/);
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["x-grade-worker-secret"]).toBeTruthy();
    expect(gradeSubmissionMock).not.toHaveBeenCalled();
  });

  it("rolls back the row when storage upload fails", async () => {
    getAppUserMock.mockResolvedValue(user("user-42"));
    uploadObjectMock.mockResolvedValue({ error: new Error("quota exceeded") });

    const result = await createSubmission({
      lessonSlug: "raid-logs",
      filename: "my.xlsx",
      mimeType: XLSX_MIME,
      fileBase64: SMALL_BASE64,
    });

    expect(result).toMatchObject({
      ok: false,
      code: "STORAGE_ERROR",
      error: "Upload failed: quota exceeded",
    });
    expect(fakeDb.callsFor("delete", "submissions")).toHaveLength(1);
    expect(extractTextMock).not.toHaveBeenCalled();
  });

  it("marks submission grading_failed when text extraction fails", async () => {
    getAppUserMock.mockResolvedValue(user("user-42"));
    uploadObjectMock.mockResolvedValue({ error: null });
    extractTextMock.mockResolvedValue({
      ok: false,
      error: "bad file",
      code: "PARSER_ERROR",
    });

    const result = await createSubmission({
      lessonSlug: "raid-logs",
      filename: "my.xlsx",
      mimeType: XLSX_MIME,
      fileBase64: SMALL_BASE64,
    });

    expect(result).toMatchObject({ ok: false, code: "PARSER_ERROR" });
    const updates = fakeDb.callsFor("update", "submissions");
    expect(updates).toHaveLength(1);
    expect(updates[0].set).toMatchObject({ status: "grading_failed" });
    expect(gradeSubmissionMock).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
