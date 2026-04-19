"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Read-only helper the polling UI uses to know when a pending
 * submission has flipped to graded / grading_failed. Scoped to the
 * authed user via RLS — returns null for unknown or foreign IDs.
 */
export async function getSubmissionStatus(
  submissionId: string
): Promise<{ status: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("submissions")
    .select("status")
    .eq("id", submissionId)
    .maybeSingle();

  return data ?? null;
}
