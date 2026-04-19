import type { createAdminClient } from "@/lib/supabase/admin";
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
 * Sums today's rubric_scores token usage and asks: would one more
 * grade (at a conservative upper-bound estimate) push us over the
 * daily cap? If yes, the caller must refuse to grade.
 *
 * "Today" is the current UTC day. The grading model pinned in env is
 * used for the estimate; historical rows are priced by their own
 * recorded `model` column.
 */
export async function checkSpendCap(
  supabase: ReturnType<typeof createAdminClient>,
  now: Date = new Date()
): Promise<SpendCheck> {
  const capUsd = env.ANTHROPIC_SPEND_CAP_USD;
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const { data: rows } = await supabase
    .from("rubric_scores")
    .select("model, input_tokens, output_tokens")
    .gte("created_at", startOfDay.toISOString());

  const spendTodayUsd = sumSpendUsd(rows ?? []);
  const estimate = estimateGradeCostUsd(GRADING_MODEL);
  const projectedUsd = spendTodayUsd + estimate;

  if (projectedUsd > capUsd) {
    return {
      ok: false,
      spendTodayUsd,
      capUsd,
      projectedUsd,
      code: "COST_CAP_EXCEEDED",
    };
  }
  return { ok: true, spendTodayUsd, capUsd, projectedUsd };
}
