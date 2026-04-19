import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { shouldSample } from "@/lib/grading/audit-sampler";

describe("shouldSample", () => {
  it("is deterministic for the same id", () => {
    const id = "0e5a3c7e-1b22-4a90-9bf0-2e8ad4a71d48";
    expect(shouldSample(id)).toBe(shouldSample(id));
  });

  it("produces 8–12% sample rate over 10,000 random UUIDs", () => {
    let hits = 0;
    const N = 10_000;
    for (let i = 0; i < N; i++) {
      if (shouldSample(randomUUID())) hits += 1;
    }
    const rate = hits / N;
    expect(rate).toBeGreaterThan(0.08);
    expect(rate).toBeLessThan(0.12);
  });

  it("honors a custom rate", () => {
    let hits = 0;
    const N = 5_000;
    for (let i = 0; i < N; i++) {
      if (shouldSample(randomUUID(), 0.5)) hits += 1;
    }
    const rate = hits / N;
    expect(rate).toBeGreaterThan(0.47);
    expect(rate).toBeLessThan(0.53);
  });
});
