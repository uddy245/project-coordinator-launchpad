/**
 * LES-006 — quiz_items RLS + public view.
 *
 * Locks the answer-leak regression: no path from an authenticated client
 * should ever reveal the `correct` column or distractor rationales.
 *
 * Runs only when SUPABASE_RUNNING=1. Safe against any environment where
 * the 20260106 + 20260107 migrations are applied.
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

describe.skipIf(!SUPABASE_RUNNING)("quiz RLS + public view", () => {
  let admin: SupabaseClient;
  const withAccess = { id: "", email: randomEmail("quiz-access"), password: "password1" };
  const noAccess = { id: "", email: randomEmail("quiz-no"), password: "password1" };
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

    const { error } = await admin
      .from("profiles")
      .update({ has_access: true })
      .eq("id", withAccess.id);
    if (error) throw error;
  });

  afterAll(async () => {
    for (const id of createdIds) await admin.auth.admin.deleteUser(id);
  });

  it("authenticated user cannot SELECT quiz_items base table", async () => {
    const client = createClient(URL, ANON);
    await client.auth.signInWithPassword({
      email: withAccess.email,
      password: withAccess.password,
    });
    const { data } = await client.from("quiz_items").select("id,correct");
    expect(data ?? []).toHaveLength(0);
  });

  it("has_access=true user sees 10 items via quiz_items_public", async () => {
    const client = createClient(URL, ANON);
    await client.auth.signInWithPassword({
      email: withAccess.email,
      password: withAccess.password,
    });
    const { data, error } = await client
      .from("quiz_items_public")
      .select("id, sort, stem, options, competency, difficulty")
      .order("sort", { ascending: true });
    expect(error).toBeNull();
    expect(data).toHaveLength(10);
    expect(data?.[0]).toMatchObject({ sort: 1, competency: "risk_completeness" });
  });

  it("public view does not expose the correct answer or rationale", async () => {
    const client = createClient(URL, ANON);
    await client.auth.signInWithPassword({
      email: withAccess.email,
      password: withAccess.password,
    });
    // selecting 'correct' from the view errors — the column simply isn't there
    const { error } = await client
      .from("quiz_items_public")
      // intentionally use a cast to string to bypass the Supabase types
      .select("correct" as unknown as string);
    expect(error).not.toBeNull();
  });

  it("has_access=false user sees zero items via the view", async () => {
    const client = createClient(URL, ANON);
    await client.auth.signInWithPassword({
      email: noAccess.email,
      password: noAccess.password,
    });
    const { data } = await client.from("quiz_items_public").select("id");
    expect(data ?? []).toHaveLength(0);
  });
});
