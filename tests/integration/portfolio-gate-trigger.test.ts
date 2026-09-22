/**
 * Gate 2 (Portfolio) — portfolio_artifacts_count refresh trigger.
 *
 * Guards the 20260623 fix: gate_status.portfolio_artifacts_count is
 * recomputed from distinct PASSED submission lessons (capped at target)
 * whenever a submission is written. Before the fix the column was never
 * updated, so Gate 2 sat at 0/7 forever.
 *
 * Runs only when TEST_DATABASE_URL points at a local replica
 * (tests/db/build-replica.sh). The trigger lives in the database, so it is
 * the same one Neon runs.
 */
import { randomUUID } from "node:crypto";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { gateStatus, lessons, submissions, usersInAuth } from "@/db/schema";

const DB_AVAILABLE = !!process.env.TEST_DATABASE_URL;

describe.skipIf(!DB_AVAILABLE)("portfolio gate count trigger", () => {
  let lessonIds: string[] = [];
  const userId = randomUUID();

  function passingSubmission(lessonId: string, pass: boolean) {
    return {
      userId,
      lessonId,
      storagePath: `${userId}/${lessonId}.docx`,
      originalFilename: "artifact.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      sizeBytes: 2048,
      status: "graded" as const,
      overallScore: pass ? 4 : 2,
      pass,
    };
  }

  async function countFor(id: string): Promise<number> {
    const [row] = await db
      .select({ n: gateStatus.portfolioArtifactsCount })
      .from(gateStatus)
      .where(eq(gateStatus.userId, id));
    return row?.n ?? -1;
  }

  beforeAll(async () => {
    const rows = await db
      .select({ id: lessons.id })
      .from(lessons)
      .where(eq(lessons.isPublished, true))
      .orderBy(lessons.number)
      .limit(3);
    if (rows.length < 3) throw new Error("need ≥3 published lessons seeded");
    lessonIds = rows.map((l) => l.id);

    await db
      .insert(usersInAuth)
      .values({ id: userId, email: `test-portfolio-${userId}@launchpad.test` });
  });

  afterAll(async () => {
    // Order matters: deleting the user directly cascades to submissions,
    // whose delete trigger re-inserts gate_status for the vanishing user
    // and trips its FK (pre-existing trigger bug — see migration report).
    await db.delete(submissions).where(eq(submissions.userId, userId));
    await db.delete(gateStatus).where(eq(gateStatus.userId, userId));
    await db.delete(usersInAuth).where(eq(usersInAuth.id, userId));
  });

  it("starts with no portfolio credit", async () => {
    // No gate_status row yet (has_access never flipped) → treated as 0.
    expect(await countFor(userId)).toBeLessThanOrEqual(0);
  });

  it("a passing submission bumps the count to 1 and creates the gate row", async () => {
    await db.insert(submissions).values(passingSubmission(lessonIds[0], true));
    expect(await countFor(userId)).toBe(1);
  });

  it("a second distinct passing lesson makes it 2", async () => {
    await db.insert(submissions).values(passingSubmission(lessonIds[1], true));
    expect(await countFor(userId)).toBe(2);
  });

  it("a FAILING submission does not count", async () => {
    await db.insert(submissions).values(passingSubmission(lessonIds[2], false));
    expect(await countFor(userId)).toBe(2);
  });

  it("a duplicate pass on an already-counted lesson does not double-count", async () => {
    await db.insert(submissions).values(passingSubmission(lessonIds[0], true));
    expect(await countFor(userId)).toBe(2);
  });

  it("flipping the failed submission to pass increments the count", async () => {
    await db
      .update(submissions)
      .set({ pass: true, overallScore: 4 })
      .where(and(eq(submissions.userId, userId), eq(submissions.lessonId, lessonIds[2])));
    expect(await countFor(userId)).toBe(3);
  });
});
