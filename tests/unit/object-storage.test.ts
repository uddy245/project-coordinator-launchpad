import { describe, it, expect } from "vitest";
import { pathFromPublicUrl, publicUrl } from "@/lib/storage/object-storage";

// AWS_ENDPOINT_URL_S3 comes from tests/setup.ts.
const BASE = "https://br-test.storage.c-1.us-east-1.aws.neon.tech";

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
    expect(pathFromPublicUrl("lesson-templates", "https://elsewhere.example/x.xlsx")).toBeNull();
  });
});
