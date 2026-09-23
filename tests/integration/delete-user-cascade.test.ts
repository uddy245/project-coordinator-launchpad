/**
 * Regression: deleting a user who has submissions must succeed.
 *
 * Before db/migrations/20260922_01, the FK cascade from auth.users deleted
 * the submissions, whose refresh_portfolio_gate trigger re-inserted
 * gate_status for the vanishing user → FK violation → delete rolled back.
 *
 * Runs against the local replica (TEST_DATABASE_URL), which applies
 * db/migrations/ on top of the live Neon schema.
 */
import { randomUUID } from "node:crypto";
import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";

const DB_AVAILABLE = !!process.env.TEST_DATABASE_URL;

describe.skipIf(!DB_AVAILABLE)("deleting a user with submissions", async () => {
  const { db } = await import("@/db");
  const { gateStatus, lessons, profiles, submissions, usersInAuth } = await import("@/db/schema");

  it("cascades cleanly through submissions and gate_status", async () => {
    const userId = randomUUID();
    await db.insert(usersInAuth).values({ id: userId, email: `delete-${userId}@launchpad.test` });
    const [lesson] = await db
      .select({ id: lessons.id })
      .from(lessons)
      .where(eq(lessons.isPublished, true))
      .limit(1);
    await db.insert(submissions).values({
      userId,
      lessonId: lesson.id,
      storagePath: `${userId}/x.docx`,
      originalFilename: "x.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      sizeBytes: 1,
      status: "graded",
      overallScore: 4,
      pass: true,
    });
    // The trigger created the gate row with credit for the passing lesson.
    const [gate] = await db.select().from(gateStatus).where(eq(gateStatus.userId, userId));
    expect(gate.portfolioArtifactsCount).toBe(1);

    await db.delete(usersInAuth).where(eq(usersInAuth.id, userId));

    for (const [table, col] of [
      [submissions, submissions.userId],
      [gateStatus, gateStatus.userId],
      [profiles, profiles.id],
    ] as const) {
      expect(await db.select().from(table).where(eq(col, userId))).toHaveLength(0);
    }
  });

  it("still recomputes the gate when a single submission is deleted", async () => {
    const userId = randomUUID();
    await db.insert(usersInAuth).values({ id: userId, email: `delete2-${userId}@launchpad.test` });
    const [lesson] = await db.select({ id: lessons.id }).from(lessons).limit(1);
    const [sub] = await db
      .insert(submissions)
      .values({
        userId,
        lessonId: lesson.id,
        storagePath: `${userId}/y.docx`,
        originalFilename: "y.docx",
        mimeType: "application/pdf",
        sizeBytes: 1,
        status: "graded",
        pass: true,
      })
      .returning({ id: submissions.id });

    await db.delete(submissions).where(eq(submissions.id, sub.id));
    const [gate] = await db.select().from(gateStatus).where(eq(gateStatus.userId, userId));
    expect(gate.portfolioArtifactsCount).toBe(0);

    await db.delete(usersInAuth).where(eq(usersInAuth.id, userId));
  });
});
