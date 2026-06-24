/**
 * Gate 2 (Portfolio) — portfolio_artifacts_count refresh trigger.
 *
 * Guards the 20260623 fix: gate_status.portfolio_artifacts_count is
 * recomputed from distinct PASSED submission lessons (capped at target)
 * whenever a submission is written. Before the fix the column was never
 * updated, so Gate 2 sat at 0/7 forever.
 *
 * Runs only when SUPABASE_RUNNING=1 (local Supabase stack).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_RUNNING = !!process.env.SUPABASE_RUNNING;
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function randomEmail(label: string) {
  return `test-${label}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@launchpad.test`;
}

describe.skipIf(!SUPABASE_RUNNING)("portfolio gate count trigger", () => {
  let admin: SupabaseClient;
  let lessonIds: string[] = [];
  const user = { id: "", email: randomEmail("portfolio") };

  function passingSubmission(lessonId: string, pass: boolean) {
    return {
      user_id: user.id,
      lesson_id: lessonId,
      storage_path: `submissions/${user.id}/${lessonId}.docx`,
      original_filename: "artifact.docx",
      mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size_bytes: 2048,
      status: "graded",
      overall_score: pass ? 4 : 2,
      pass,
    };
  }

  async function countFor(userId: string): Promise<number> {
    const { data } = await admin
      .from("gate_status")
      .select("portfolio_artifacts_count")
      .eq("user_id", userId)
      .maybeSingle();
    return data?.portfolio_artifacts_count ?? -1;
  }

  beforeAll(async () => {
    admin = createClient(URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

    const { data: lessons } = await admin
      .from("lessons")
      .select("id")
      .eq("is_published", true)
      .order("number", { ascending: true })
      .limit(3);
    if (!lessons || lessons.length < 3) throw new Error("need ≥3 published lessons seeded");
    lessonIds = lessons.map((l) => l.id);

    const { data, error } = await admin.auth.admin.createUser({
      email: user.email,
      email_confirm: true,
    });
    if (error) throw error;
    user.id = data.user.id;
  });

  afterAll(async () => {
    if (user.id) await admin.auth.admin.deleteUser(user.id); // cascades submissions + gate_status
  });

  it("starts with no portfolio credit", async () => {
    // No gate_status row yet (has_access never flipped) → treated as 0.
    expect(await countFor(user.id)).toBeLessThanOrEqual(0);
  });

  it("a passing submission bumps the count to 1 and creates the gate row", async () => {
    await admin.from("submissions").insert(passingSubmission(lessonIds[0], true));
    expect(await countFor(user.id)).toBe(1);
  });

  it("a second distinct passing lesson makes it 2", async () => {
    await admin.from("submissions").insert(passingSubmission(lessonIds[1], true));
    expect(await countFor(user.id)).toBe(2);
  });

  it("a FAILING submission does not count", async () => {
    await admin.from("submissions").insert(passingSubmission(lessonIds[2], false));
    expect(await countFor(user.id)).toBe(2);
  });

  it("a duplicate pass on an already-counted lesson does not double-count", async () => {
    await admin.from("submissions").insert(passingSubmission(lessonIds[0], true));
    expect(await countFor(user.id)).toBe(2);
  });

  it("flipping the failed submission to pass increments the count", async () => {
    await admin
      .from("submissions")
      .update({ pass: true, overall_score: 4 })
      .eq("user_id", user.id)
      .eq("lesson_id", lessonIds[2]);
    expect(await countFor(user.id)).toBe(3);
  });
});
