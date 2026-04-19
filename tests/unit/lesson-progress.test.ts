import { describe, it, expect } from "vitest";
import { computeLessonStatus } from "@/lib/lessons/progress";

describe("computeLessonStatus", () => {
  it("returns not_started when row is null", () => {
    expect(computeLessonStatus(null)).toBe("not_started");
  });

  it("returns not_started when row is undefined", () => {
    expect(computeLessonStatus(undefined)).toBe("not_started");
  });

  it("covers all 8 permutations of the three booleans", () => {
    const cases: {
      row: { video_watched: boolean; quiz_passed: boolean; artifact_submitted: boolean };
      want: string;
    }[] = [
      {
        row: { video_watched: false, quiz_passed: false, artifact_submitted: false },
        want: "not_started",
      },
      {
        row: { video_watched: true, quiz_passed: false, artifact_submitted: false },
        want: "in_progress",
      },
      {
        row: { video_watched: false, quiz_passed: true, artifact_submitted: false },
        want: "in_progress",
      },
      {
        row: { video_watched: false, quiz_passed: false, artifact_submitted: true },
        want: "in_progress",
      },
      {
        row: { video_watched: true, quiz_passed: true, artifact_submitted: false },
        want: "in_progress",
      },
      {
        row: { video_watched: true, quiz_passed: false, artifact_submitted: true },
        want: "in_progress",
      },
      {
        row: { video_watched: false, quiz_passed: true, artifact_submitted: true },
        want: "in_progress",
      },
      {
        row: { video_watched: true, quiz_passed: true, artifact_submitted: true },
        want: "completed",
      },
    ];
    for (const c of cases) {
      expect(computeLessonStatus(c.row)).toBe(c.want);
    }
  });
});
