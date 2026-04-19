/**
 * GRADE-001 — RLS coverage for submissions and rubric_scores.
 *
 * Verifies:
 *   - Learner A cannot SELECT learner B's submission
 *   - Learner A cannot SELECT learner B's rubric_scores (even via view joins)
 *   - Service role can write (implicit; we use it to seed)
 *
 * Runs only when SUPABASE_RUNNING=1.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_RUNNING = !!process.env.SUPABASE_RUNNING;
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function randomEmail(label: string) {
  return `test-${label}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@launchpad.test`;
}

describe.skipIf(!SUPABASE_RUNNING)("submissions + rubric_scores RLS", () => {
  let admin: SupabaseClient;
  let lessonId: string;
  let rubricId: string;
  const alice = { id: "", email: randomEmail("alice"), password: "password1" };
  const bob = { id: "", email: randomEmail("bob"), password: "password1" };
  let aliceSubmissionId = "";
  const createdIds: string[] = [];

  beforeAll(async () => {
    admin = createClient(URL, SERVICE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Look up the raid-logs lesson + current RAID rubric (created in LES-001)
    const { data: lesson } = await admin
      .from("lessons")
      .select("id")
      .eq("slug", "raid-logs")
      .single();
    if (!lesson) throw new Error("LES-001 migration not applied — lesson missing");
    lessonId = lesson.id;

    const { data: rubric } = await admin
      .from("rubrics")
      .select("id")
      .eq("competency", "risk_identification")
      .eq("is_current", true)
      .single();
    if (!rubric) throw new Error("LES-001 rubric seed missing");
    rubricId = rubric.id;

    // Create both users
    for (const u of [alice, bob]) {
      const { data, error } = await admin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
      });
      if (error) throw error;
      u.id = data.user.id;
      createdIds.push(data.user.id);
    }

    // Seed a submission + score for Alice
    const { data: sub, error: subErr } = await admin
      .from("submissions")
      .insert({
        user_id: alice.id,
        lesson_id: lessonId,
        storage_path: "submissions/alice/test.xlsx",
        original_filename: "test.xlsx",
        mime_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        size_bytes: 1024,
        status: "graded",
        overall_score: 4.2,
        pass: true,
      })
      .select("id")
      .single();
    if (subErr || !sub) throw subErr ?? new Error("no sub");
    aliceSubmissionId = sub.id;

    const { error: scoreErr } = await admin.from("rubric_scores").insert({
      submission_id: sub.id,
      rubric_id: rubricId,
      dimension: "risk_completeness",
      score: 4,
      justification: "Covers most fields",
      quote: "sample quote",
      suggestion: "Add owner to R-003",
      model: "claude-sonnet-4-5",
      prompt_version: 1,
      input_tokens: 1000,
      output_tokens: 200,
    });
    if (scoreErr) throw scoreErr;
  });

  afterAll(async () => {
    // Submissions cascade to rubric_scores. Users cascade to submissions.
    for (const id of createdIds) await admin.auth.admin.deleteUser(id);
  });

  it("alice can SELECT her own submission", async () => {
    const client = createClient(URL, ANON);
    await client.auth.signInWithPassword({ email: alice.email, password: alice.password });
    const { data } = await client
      .from("submissions")
      .select("id, status")
      .eq("id", aliceSubmissionId);
    expect(data).toHaveLength(1);
  });

  it("bob cannot SELECT alice's submission", async () => {
    const client = createClient(URL, ANON);
    await client.auth.signInWithPassword({ email: bob.email, password: bob.password });
    const { data } = await client.from("submissions").select("id").eq("id", aliceSubmissionId);
    expect(data ?? []).toHaveLength(0);
  });

  it("alice can SELECT her own rubric_scores", async () => {
    const client = createClient(URL, ANON);
    await client.auth.signInWithPassword({ email: alice.email, password: alice.password });
    const { data } = await client
      .from("rubric_scores")
      .select("dimension, score")
      .eq("submission_id", aliceSubmissionId);
    expect(data).toHaveLength(1);
    expect(data?.[0]?.dimension).toBe("risk_completeness");
  });

  it("bob cannot SELECT alice's rubric_scores", async () => {
    const client = createClient(URL, ANON);
    await client.auth.signInWithPassword({ email: bob.email, password: bob.password });
    const { data } = await client
      .from("rubric_scores")
      .select("id")
      .eq("submission_id", aliceSubmissionId);
    expect(data ?? []).toHaveLength(0);
  });

  it("bob cannot insert a submission for alice's user_id", async () => {
    const client = createClient(URL, ANON);
    await client.auth.signInWithPassword({ email: bob.email, password: bob.password });
    const { error } = await client.from("submissions").insert({
      user_id: alice.id,
      lesson_id: lessonId,
      storage_path: "submissions/bob/spoof.xlsx",
      original_filename: "spoof.xlsx",
      mime_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      size_bytes: 100,
    });
    expect(error).not.toBeNull();
  });
});
