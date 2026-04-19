import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  getUserMock,
  lessonMaybeSingleMock,
  insertReturnMock,
  updateEqMock,
  uploadMock,
  gradeSubmissionMock,
  extractTextMock,
  deleteEqMock,
} = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  lessonMaybeSingleMock: vi.fn(),
  insertReturnMock: vi.fn(),
  updateEqMock: vi.fn(),
  uploadMock: vi.fn(),
  gradeSubmissionMock: vi.fn(),
  extractTextMock: vi.fn(),
  deleteEqMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: getUserMock },
    from: (table: string) => {
      if (table === "lessons") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({ maybeSingle: lessonMaybeSingleMock }),
            }),
          }),
        };
      }
      throw new Error("unexpected table on user client: " + table);
    },
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "submissions") {
        return {
          insert: () => ({
            select: () => ({
              single: insertReturnMock,
            }),
          }),
          update: () => ({ eq: updateEqMock }),
          delete: () => ({ eq: deleteEqMock }),
        };
      }
      throw new Error("unexpected admin table: " + table);
    },
    storage: { from: () => ({ upload: uploadMock }) },
  }),
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

beforeEach(() => {
  getUserMock.mockReset();
  lessonMaybeSingleMock.mockReset();
  insertReturnMock.mockReset();
  updateEqMock.mockReset();
  uploadMock.mockReset();
  gradeSubmissionMock.mockReset();
  extractTextMock.mockReset();
  deleteEqMock.mockReset();

  updateEqMock.mockResolvedValue({ error: null });
  deleteEqMock.mockResolvedValue({ error: null });

  // Replace global fetch so the fire-and-forget grading dispatch is
  // captured but doesn't actually run (and doesn't need a network).
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(new Response(null, { status: 202 })))
  );
});

describe("createSubmission", () => {
  it("rejects unauthenticated calls", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const result = await createSubmission({
      lessonSlug: "raid-logs",
      filename: "x.xlsx",
      mimeType: XLSX_MIME,
      fileBase64: SMALL_BASE64,
    });
    expect(result).toMatchObject({ ok: false, code: "UNAUTHENTICATED" });
    expect(insertReturnMock).not.toHaveBeenCalled();
  });

  it("rejects an unknown lesson slug", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    lessonMaybeSingleMock.mockResolvedValue({ data: null });
    const result = await createSubmission({
      lessonSlug: "unknown",
      filename: "x.xlsx",
      mimeType: XLSX_MIME,
      fileBase64: SMALL_BASE64,
    });
    expect(result).toMatchObject({ ok: false, code: "NOT_FOUND" });
  });

  it("rejects a file exceeding the 10MB cap", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    lessonMaybeSingleMock.mockResolvedValue({ data: { id: "lesson-1" } });
    // 10.5 MB of base64 -> raw ~7.9 MB? No — base64 is 4/3 size. We need
    // raw > 10MB which means base64 > ~13.33MB. Build a Buffer of 11MB
    // directly and base64 it.
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

  it("happy path: inserts, uploads, extracts, schedules grading", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-42" } } });
    lessonMaybeSingleMock.mockResolvedValue({ data: { id: "lesson-1" } });
    insertReturnMock.mockResolvedValue({ data: { id: "sub-99" }, error: null });
    uploadMock.mockResolvedValue({ error: null });
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
    expect(uploadMock).toHaveBeenCalled();
    const [path] = uploadMock.mock.calls[0] ?? [];
    expect(path).toBe("user-42/sub-99.xlsx");

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
    getUserMock.mockResolvedValue({ data: { user: { id: "user-42" } } });
    lessonMaybeSingleMock.mockResolvedValue({ data: { id: "lesson-1" } });
    insertReturnMock.mockResolvedValue({ data: { id: "sub-99" }, error: null });
    uploadMock.mockResolvedValue({ error: { message: "quota exceeded" } });

    const result = await createSubmission({
      lessonSlug: "raid-logs",
      filename: "my.xlsx",
      mimeType: XLSX_MIME,
      fileBase64: SMALL_BASE64,
    });

    expect(result).toMatchObject({ ok: false, code: "STORAGE_ERROR" });
    expect(deleteEqMock).toHaveBeenCalled();
  });

  it("marks submission grading_failed when text extraction fails", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-42" } } });
    lessonMaybeSingleMock.mockResolvedValue({ data: { id: "lesson-1" } });
    insertReturnMock.mockResolvedValue({ data: { id: "sub-99" }, error: null });
    uploadMock.mockResolvedValue({ error: null });
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
    expect(updateEqMock).toHaveBeenCalled();
    expect(gradeSubmissionMock).not.toHaveBeenCalled();
  });
});
