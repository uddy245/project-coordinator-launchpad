/**
 * E2E helpers for the authed dashboard-gate spec.
 *
 * The app is magic-link only, so we log a seeded test user in
 * programmatically via the GoTrue admin `generateLink` action and visit
 * the resulting link (which lands on /auth/callback and establishes the
 * SSR session). All seeding is reversible — `cleanup()` removes every row
 * and the user itself.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL. When
 * absent the spec skips (see HAS_SERVICE_ROLE), exactly like the
 * calibration corpus skips without ANTHROPIC_API_KEY — so default
 * `pnpm test:e2e` stays green for contributors without the service role.
 *
 * NOTE: the Playwright webServer runs `pnpm dev`, which reads the same
 * .env.local these vars come from — so the spec seeds and asserts against
 * whatever Supabase that points at. Use a local stack (`supabase start`)
 * if you don't want a transient e2e user created on a shared project.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Page } from "@playwright/test";

// Playwright doesn't auto-load .env.local; parse it ourselves as a fallback.
function loadEnvLocal(): void {
  try {
    const text = readFileSync(resolve(__dirname, "..", "..", "..", ".env.local"), "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    /* no .env.local — rely on the ambient environment */
  }
}
loadEnvLocal();

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
export const HAS_SERVICE_ROLE = Boolean(URL && SERVICE_KEY);

export const TEST_EMAIL = "e2e+gate-status@projectcoordinator.test";
const FOUNDATION_SLUGS = ["coordinator-role", "project-lifecycle", "written-voice", "mindset"];

export function admin(): SupabaseClient {
  return createClient(URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Create (or fetch) the dedicated test user. Returns its id. */
export async function ensureTestUser(db: SupabaseClient): Promise<string> {
  const created = await db.auth.admin.createUser({
    email: TEST_EMAIL,
    email_confirm: true,
    password: crypto.randomUUID(),
  });
  if (created.data.user) return created.data.user.id;

  // Already exists — page through and find it.
  for (let page = 1; page <= 20; page++) {
    const { data } = await db.auth.admin.listUsers({ page, perPage: 200 });
    const found = data.users.find((u) => u.email === TEST_EMAIL);
    if (found) return found.id;
    if (data.users.length < 200) break;
  }
  throw new Error(`could not create or find test user ${TEST_EMAIL}`);
}

export type GateSeed = {
  portfolioCount: number;
  portfolioTarget?: number;
  foundationComplete: boolean;
  interviewPasses: number;
};

/** Flip a user's gate inputs to a known state. Idempotent. */
export async function seedGateState(db: SupabaseClient, userId: string, seed: GateSeed): Promise<void> {
  const target = seed.portfolioTarget ?? 7;

  await db.from("gate_status").upsert({
    user_id: userId,
    portfolio_artifacts_count: seed.portfolioCount,
    portfolio_artifacts_target: target,
    portfolio_complete: seed.portfolioCount >= target,
    foundation_complete: seed.foundationComplete,
  });

  const { data: foundation } = await db.from("lessons").select("id, slug").in("slug", FOUNDATION_SLUGS);
  if (foundation?.length) {
    await db.from("lesson_progress").upsert(
      foundation.map((l) => ({
        user_id: userId,
        lesson_id: l.id,
        video_watched: seed.foundationComplete,
        quiz_passed: seed.foundationComplete,
        artifact_submitted: seed.foundationComplete,
      }))
    );
  }

  // Clear any prior test passes, then seed exactly `interviewPasses` of them.
  await db.from("mock_interview_responses").delete().eq("user_id", userId);
  if (seed.interviewPasses > 0) {
    const { data: scenarios } = await db
      .from("mock_interview_scenarios")
      .select("id")
      .eq("is_published", true)
      .limit(seed.interviewPasses);
    if (scenarios?.length) {
      await db.from("mock_interview_responses").insert(
        scenarios.map((s) => ({
          user_id: userId,
          scenario_id: s.id,
          response_text: "__e2e_gate_test__",
          status: "graded",
          pass: true,
        }))
      );
    }
  }
}

/** Remove every seeded row and the user. Safe to call in afterAll. */
export async function cleanup(db: SupabaseClient, userId: string): Promise<void> {
  await db.from("mock_interview_responses").delete().eq("user_id", userId);
  await db.from("lesson_progress").delete().eq("user_id", userId);
  await db.from("gate_status").delete().eq("user_id", userId);
  await db.auth.admin.deleteUser(userId).catch(() => {});
}

/** Log the seeded user in by minting + visiting a magic link. */
export async function loginAs(page: Page, db: SupabaseClient, baseURL: string): Promise<void> {
  const { data, error } = await db.auth.admin.generateLink({
    type: "magiclink",
    email: TEST_EMAIL,
    options: { redirectTo: `${baseURL}/auth/callback` },
  });
  if (error || !data.properties?.action_link) {
    throw new Error(`generateLink failed: ${error?.message ?? "no action_link"}`);
  }
  await page.goto(data.properties.action_link);
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
}
