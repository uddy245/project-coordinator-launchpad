import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

// The test owns its endpoint: CI sets AWS_ENDPOINT_URL_S3 to a placeholder,
// so stub it and re-import the modules (env is read at import time).
const BASE = "https://br-test.storage.c-1.us-east-1.aws.neon.tech";

let publicUrl: typeof import("@/lib/storage/object-storage").publicUrl;
let pathFromPublicUrl: typeof import("@/lib/storage/object-storage").pathFromPublicUrl;

beforeAll(async () => {
  vi.stubEnv("AWS_ENDPOINT_URL_S3", BASE);
  vi.resetModules();
  ({ publicUrl, pathFromPublicUrl } = await import("@/lib/storage/object-storage"));
});

afterAll(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("object storage URLs", () => {
  it("builds direct public_read URLs (path-style, encoded segments)", () => {
    expect(publicUrl("lesson-videos", "raid-logs/raid logs.mp4")).toBe(
      `${BASE}/lesson-videos/raid-logs/raid%20logs.mp4`
    );
  });

  it("refuses to build public URLs for private buckets", () => {
    expect(() => publicUrl("submissions", "u/s.pdf")).toThrow(/private/);
    expect(() => publicUrl("capstone-artifacts", "u/a/x.pdf")).toThrow(/private/);
  });

  it("recovers the object path from Neon and legacy Supabase URLs", () => {
    expect(pathFromPublicUrl("lesson-templates", `${BASE}/lesson-templates/a/b%20c.xlsx`)).toBe(
      "a/b c.xlsx"
    );
    expect(
      pathFromPublicUrl(
        "lesson-templates",
        "https://ref.supabase.co/storage/v1/object/public/lesson-templates/a/b.xlsx"
      )
    ).toBe("a/b.xlsx");
  });

  it("round-trips publicUrl → pathFromPublicUrl", () => {
    const path = "raid/RAID template [v2].xlsx";
    expect(pathFromPublicUrl("lesson-templates", publicUrl("lesson-templates", path))).toBe(path);
  });

  it("returns null for URLs on other hosts", () => {
    expect(pathFromPublicUrl("lesson-templates", "https://elsewhere.example/x.xlsx")).toBeNull();
    expect(
      pathFromPublicUrl(
        "lesson-templates",
        "https://br-other.storage.c-1.us-east-1.aws.neon.tech/lesson-templates/x.xlsx"
      )
    ).toBeNull();
  });
});
