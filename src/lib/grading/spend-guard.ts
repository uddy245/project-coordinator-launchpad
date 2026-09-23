import { and, count, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { rubricScores, tutorMessages } from "@/db/schema";
import { env } from "@/env";
import { estimateGradeCostUsd, sumSpendUsd } from "@/lib/anthropic/pricing";
import { GRADING_MODEL } from "@/lib/anthropic/client";

export type SpendCheck =
  | { ok: true; spendTodayUsd: number; capUsd: number; projectedUsd: number }
  | {
      ok: false;
      spendTodayUsd: number;
      capUsd: number;
      projectedUsd: number;
      code: "COST_CAP_EXCEEDED";
    };

/**
 * Sums today's AI token usage across ALL metered routes (rubric_scores +
 * tutor_messages) and asks: would one more grade push us over the daily cap?
 *
 * "Today" is the current UTC day. Historical rows are priced by their own
 * recorded `model` column; the next-grade estimate uses the pinned grading
 * model. tutor_messages assistant rows carry the full exchange token count.
 */
export async function checkSpendCap(now: Date = new Date()): Promise<SpendCheck> {
  const capUsd = env.ANTHROPIC_SPEND_CAP_USD;
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const since = startOfDay.toISOString();

  // System-level: sums spend across ALL users (no user filter by design).
  const [rubricRows, tutorRows] = await Promise.all([
    db
      .select({
        model: rubricScores.model,
        input_tokens: rubricScores.inputTokens,
        output_tokens: rubricScores.outputTokens,
      })
      .from(rubricScores)
      .where(gte(rubricScores.createdAt, since)),
    // Only assistant rows carry token counts; user rows have 0s.
    db
      .select({
        model: tutorMessages.model,
        input_tokens: tutorMessages.inputTokens,
        output_tokens: tutorMessages.outputTokens,
      })
      .from(tutorMessages)
      .where(and(gte(tutorMessages.createdAt, since), eq(tutorMessages.role, "assistant"))),
  ]);

  const spendTodayUsd = sumSpendUsd([...rubricRows, ...tutorRows]);
  const estimate = estimateGradeCostUsd(GRADING_MODEL);
  const projectedUsd = spendTodayUsd + estimate;

  if (projectedUsd > capUsd) {
    return { ok: false, spendTodayUsd, capUsd, projectedUsd, code: "COST_CAP_EXCEEDED" };
  }
  return { ok: true, spendTodayUsd, capUsd, projectedUsd };
}

export type MessageCapCheck =
  | { ok: true; countToday: number; cap: number }
  | { ok: false; countToday: number; cap: number; code: "MESSAGE_CAP_EXCEEDED" };

/**
 * Checks whether a user has sent their daily message quota to the tutor.
 * Counts 'user' role rows today — one per question asked.
 */
export async function checkUserMessageCap(
  userId: string,
  now: Date = new Date()
): Promise<MessageCapCheck> {
  const cap = env.TUTOR_DAILY_MESSAGE_CAP;
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  let countToday: number;
  try {
    const [row] = await db
      .select({ n: count() })
      .from(tutorMessages)
      .where(
        and(
          eq(tutorMessages.userId, userId),
          eq(tutorMessages.role, "user"),
          gte(tutorMessages.createdAt, startOfDay.toISOString())
        )
      );
    countToday = Number(row?.n ?? 0);
  } catch (err) {
    // Fail open — a DB error shouldn't lock out a user.
    console.error(
      "[spend-guard] message cap query failed:",
      err instanceof Error ? err.message : err
    );
    return { ok: true, countToday: 0, cap };
  }

  if (countToday >= cap) {
    return { ok: false, countToday, cap, code: "MESSAGE_CAP_EXCEEDED" };
  }
  return { ok: true, countToday, cap };
}
