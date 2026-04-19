/**
 * Confirms that after LES-001's seed:
 *  - A learner with has_access=true can read the RAID lesson and current rubric
 *  - A learner with has_access=false cannot see the lesson (policy requires has_access)
 *  - The RAID rubric v1 has the expected 5 weighted dimensions
 *
 * Runs only when SUPABASE_RUNNING=1 (same pattern as other integration tests).
 * Safe on any Supabase environment where the 20260105 migration is applied.
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

describe.skipIf(!SUPABASE_RUNNING)("lessons + rubrics RLS and seed", () => {
  let admin: SupabaseClient;
  const withAccess = { id: "", email: randomEmail("with-access"), password: "password1" };
  const noAccess = { id: "", email: randomEmail("no-access"), password: "password1" };
  const createdIds: string[] = [];

  beforeAll(async () => {
    admin = createClient(URL, SERVICE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    for (const u of [withAccess, noAccess]) {
      const { data, error } = await admin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
      });
      if (error) throw error;
      u.id = data.user.id;
      createdIds.push(data.user.id);
    }

    // Grant access to the first user (service role bypasses the
    // column-level UPDATE grant from 20260102).
    const { error } = await admin
      .from("profiles")
      .update({ has_access: true })
      .eq("id", withAccess.id);
    if (error) throw error;
  });

  afterAll(async () => {
    for (const id of createdIds) {
      await admin.auth.admin.deleteUser(id);
    }
  });

  it("seeded RAID rubric has 5 weighted dimensions summing to 1.0", async () => {
    const { data, error } = await admin
      .from("rubrics")
      .select("schema_json")
      .eq("competency", "risk_identification")
      .eq("is_current", true)
      .single();

    expect(error).toBeNull();
    const r = data?.schema_json as {
      dimensions: { name: string; weight: number }[];
    };
    expect(r.dimensions).toHaveLength(5);
    const sum = r.dimensions.reduce((acc, d) => acc + d.weight, 0);
    expect(sum).toBeCloseTo(1.0, 4);
    expect(r.dimensions.map((d) => d.name).sort()).toEqual([
      "living_artifact_evidence",
      "mitigation_realism",
      "ownership_and_accountability",
      "risk_completeness",
      "risk_differentiation",
    ]);
  });

  it("user with has_access=true can SELECT the RAID lesson", async () => {
    const client = createClient(URL, ANON);
    await client.auth.signInWithPassword({
      email: withAccess.email,
      password: withAccess.password,
    });
    const { data, error } = await client
      .from("lessons")
      .select("slug, number, title")
      .eq("slug", "raid-logs");
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(1);
    expect(data?.[0]).toMatchObject({ slug: "raid-logs", number: 20 });
  });

  it("user with has_access=false cannot SELECT the RAID lesson", async () => {
    const client = createClient(URL, ANON);
    await client.auth.signInWithPassword({
      email: noAccess.email,
      password: noAccess.password,
    });
    const { data } = await client.from("lessons").select("slug").eq("slug", "raid-logs");
    expect(data ?? []).toHaveLength(0);
  });

  it("current grading prompt is registered in prompts table", async () => {
    const { data, error } = await admin
      .from("prompts")
      .select("name, version, is_current")
      .eq("name", "grade-raid")
      .eq("is_current", true);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0]).toMatchObject({ name: "grade-raid", version: 1, is_current: true });
  });
});
