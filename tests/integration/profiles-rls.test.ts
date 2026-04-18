/**
 * RLS and trigger tests for public.profiles.
 *
 * Skipped unless SUPABASE_RUNNING=1 is set AND the target Supabase instance
 * has the migrations from 20260101_init.sql and 20260102_profiles_hardening.sql
 * applied. Runs against whatever Supabase the standard env vars point at —
 * safe on a preview DB, destructive on prod (creates/deletes users).
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

describe.skipIf(!SUPABASE_RUNNING)("profiles RLS", () => {
  let admin: SupabaseClient;
  const createdUserIds: string[] = [];

  const userA = { id: "", email: randomEmail("a"), password: "password1" };
  const userB = { id: "", email: randomEmail("b"), password: "password1" };

  beforeAll(async () => {
    admin = createClient(URL, SERVICE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    for (const u of [userA, userB]) {
      const { data, error } = await admin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
      });
      if (error) throw error;
      u.id = data.user.id;
      createdUserIds.push(data.user.id);
    }
  });

  afterAll(async () => {
    for (const id of createdUserIds) {
      await admin.auth.admin.deleteUser(id);
    }
  });

  it("trigger auto-creates a profile row with safe defaults", async () => {
    const { data, error } = await admin
      .from("profiles")
      .select("id, email, role, has_access")
      .eq("id", userA.id)
      .single();
    expect(error).toBeNull();
    expect(data).toMatchObject({
      id: userA.id,
      role: "learner",
      has_access: false,
    });
  });

  it("user A cannot SELECT user B's profile via RLS", async () => {
    const a = createClient(URL, ANON);
    await a.auth.signInWithPassword({ email: userA.email, password: userA.password });

    const { data } = await a.from("profiles").select("id").eq("id", userB.id);
    expect(data ?? []).toHaveLength(0);
  });

  it("user A can UPDATE full_name on their own profile", async () => {
    const a = createClient(URL, ANON);
    await a.auth.signInWithPassword({ email: userA.email, password: userA.password });

    const { error } = await a.from("profiles").update({ full_name: "New Name" }).eq("id", userA.id);
    expect(error).toBeNull();

    const { data } = await admin.from("profiles").select("full_name").eq("id", userA.id).single();
    expect(data?.full_name).toBe("New Name");
  });

  it("user A cannot escalate to admin (has_access / role column grant blocks it)", async () => {
    const a = createClient(URL, ANON);
    await a.auth.signInWithPassword({ email: userA.email, password: userA.password });

    const { error } = await a
      .from("profiles")
      .update({ has_access: true, role: "admin" })
      .eq("id", userA.id);
    expect(error).not.toBeNull();

    const { data } = await admin
      .from("profiles")
      .select("role, has_access")
      .eq("id", userA.id)
      .single();
    expect(data).toMatchObject({ role: "learner", has_access: false });
  });

  it("is_admin() returns false for a learner", async () => {
    const a = createClient(URL, ANON);
    await a.auth.signInWithPassword({ email: userA.email, password: userA.password });

    const { data, error } = await a.rpc("is_admin");
    expect(error).toBeNull();
    expect(data).toBe(false);
  });
});
