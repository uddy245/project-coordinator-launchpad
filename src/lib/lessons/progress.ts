export type LessonProgressRow = {
  video_watched: boolean;
  quiz_passed: boolean;
  artifact_submitted: boolean;
};

export type LessonStatus = "not_started" | "in_progress" | "completed";

/**
 * Reduce a lesson_progress row (or absence of one) to a single status.
 *
 *   - No row, or all three flags false → not_started
 *   - All three flags true → completed
 *   - Otherwise → in_progress
 */
export function computeLessonStatus(row: LessonProgressRow | null | undefined): LessonStatus {
  if (!row) return "not_started";
  const { video_watched, quiz_passed, artifact_submitted } = row;
  const any = video_watched || quiz_passed || artifact_submitted;
  const all = video_watched && quiz_passed && artifact_submitted;
  if (all) return "completed";
  if (any) return "in_progress";
  return "not_started";
}
