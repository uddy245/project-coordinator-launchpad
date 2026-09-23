"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { submissions } from "@/db/schema";
import { getAppUser } from "@/lib/auth/session";

/**
 * Read-only helper the polling UI uses to know when a pending
 * submission has flipped to graded / grading_failed. Scoped to the
 * authed user (owner filter) — returns null for unknown or foreign IDs.
 */
export async function getSubmissionStatus(
  submissionId: string
): Promise<{ status: string } | null> {
  const user = await getAppUser();
  if (!user) return null;

  try {
    const [row] = await db
      .select({ status: submissions.status })
      .from(submissions)
      .where(and(eq(submissions.id, submissionId), eq(submissions.userId, user.id)))
      .limit(1);
    return row ?? null;
  } catch {
    return null;
  }
}
