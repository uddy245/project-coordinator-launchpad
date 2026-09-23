/**
 * E2E helpers for the authed dashboard-gate spec.
 *
 * Auth is Neon Auth (managed Better Auth, email + password). The helper
 * signs a dedicated test user up through the Neon Auth HTTP API, marks its
 * email verified directly in the database (the app only maps VERIFIED Neon
 * Auth emails to an `auth.users` row — see src/lib/auth/session.ts), and
 * then logs in through the real /login form. Gate inputs are seeded with
 * plain SQL against the app's Neon Postgres database. `cleanup()` removes
 * every app-side row for the user (including its `auth.users` row).
 *
 * Requires DATABASE_URL + NEON_AUTH_BASE_URL + E2E_TEST_PASSWORD. When any
 * is absent the spec skips (see HAS_E2E_AUTH), exactly like the calibration
 * corpus skips without ANTHROPIC_API_KEY — so default `pnpm test:e2e` stays
 * green for contributors without database credentials.
 *
 * NOTE: the Playwright webServer runs `pnpm dev`, which reads the same
 * .env.local these vars come from — so the spec seeds and asserts against
 * whatever database / Neon Auth project that points at. Use a Neon branch
 * if you don't want a transient e2e user created on a shared database.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Pool } from "pg";
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

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const NEON_AUTH_BASE_URL = (process.env.NEON_AUTH_BASE_URL ?? "").replace(/\/+$/, "");
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD ?? "";
export const HAS_E2E_AUTH = Boolean(DATABASE_URL && NEON_AUTH_BASE_URL && TEST_PASSWORD);

/** Origin Neon Auth expects on sign-up; matches playwright.config baseURL. */
const APP_BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
  /\/+$/,
  ""
);

export const TEST_EMAIL = "e2e+gate-status@projectcoordinator.test";
const FOUNDATION_SLUGS = ["coordinator-role", "project-lifecycle", "written-voice", "mindset"];

/** Pooled connection to the app database. Call `.end()` when done. */
export function testDb(): Pool {
  return new Pool({ connectionString: DATABASE_URL, max: 2 });
}

/**
 * Create (or reuse) the dedicated test user and return its app user id
 * (the `auth.users.id` every public table references).
 */
export async function ensureTestUser(db: Pool, appBaseURL = APP_BASE_URL): Promise<string> {
  // 1. Neon Auth account (email + password). "Already exists" is fine.
  const res = await fetch(`${NEON_AUTH_BASE_URL}/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: appBaseURL },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD, name: "E2E Gate" }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (!/already|exist/i.test(body)) {
      throw new Error(`Neon Auth sign-up failed (${res.status}): ${body.slice(0, 300)}`);
    }
  }

  // 2. Mark the email verified — the app refuses to map unverified sessions.
  // ASSUMPTION: Neon Auth stores Better Auth's tables in the `neon_auth`
  // schema of this database, with the default `user` table / camelCase
  // `emailVerified` column.
  try {
    const verified = await db.query(
      `update neon_auth."user" set "emailVerified" = true where lower(email) = lower($1)`,
      [TEST_EMAIL]
    );
    if (verified.rowCount === 0) {
      throw new Error(`no neon_auth."user" row for ${TEST_EMAIL} after sign-up`);
    }
  } catch (err) {
    throw new Error(
      `Could not mark the e2e user's email verified. This helper assumes Neon Auth ` +
        `keeps its Better Auth tables in the "neon_auth" schema of DATABASE_URL ` +
        `(table neon_auth."user", column "emailVerified"). Underlying error: ${
          err instanceof Error ? err.message : String(err)
        }`
    );
  }

  // 3. App rows, provisioned the same way src/lib/auth/session.ts does.
  const existing = await db.query<{ id: string }>(
    `select id from auth.users
      where lower(email) = lower($1) and deleted_at is null
      order by created_at limit 1`,
    [TEST_EMAIL]
  );
  let id = existing.rows[0]?.id;
  if (!id) {
    const inserted = await db.query<{ id: string }>(
      `insert into auth.users
         (id, email, aud, role, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
          created_at, updated_at)
       values (gen_random_uuid(), lower($1), 'authenticated', 'authenticated', now(),
               '{"provider":"neon_auth"}'::jsonb, '{"full_name":"E2E Gate"}'::jsonb, now(), now())
       returning id`,
      [TEST_EMAIL]
    );
    id = inserted.rows[0].id;
  }
  await db.query(
    `insert into public.profiles (id, email, full_name)
     values ($1, lower($2), 'E2E Gate')
     on conflict do nothing`,
    [id, TEST_EMAIL]
  );
  return id;
}

export type GateSeed = {
  portfolioCount: number;
  portfolioTarget?: number;
  foundationComplete: boolean;
  interviewPasses: number;
};

/** Flip a user's gate inputs to a known state. Idempotent. */
export async function seedGateState(db: Pool, userId: string, seed: GateSeed): Promise<void> {
  const target = seed.portfolioTarget ?? 7;

  await db.query(
    `insert into public.gate_status
       (user_id, portfolio_artifacts_count, portfolio_artifacts_target,
        portfolio_complete, foundation_complete)
     values ($1, $2, $3, $4, $5)
     on conflict (user_id) do update set
       portfolio_artifacts_count = excluded.portfolio_artifacts_count,
       portfolio_artifacts_target = excluded.portfolio_artifacts_target,
       portfolio_complete = excluded.portfolio_complete,
       foundation_complete = excluded.foundation_complete`,
    [userId, seed.portfolioCount, target, seed.portfolioCount >= target, seed.foundationComplete]
  );

  const foundation = await db.query<{ id: string }>(
    `select id from public.lessons where slug = any($1::text[])`,
    [FOUNDATION_SLUGS]
  );
  for (const l of foundation.rows) {
    await db.query(
      `insert into public.lesson_progress
         (user_id, lesson_id, video_watched, quiz_passed, artifact_submitted)
       values ($1, $2, $3, $3, $3)
       on conflict (user_id, lesson_id) do update set
         video_watched = excluded.video_watched,
         quiz_passed = excluded.quiz_passed,
         artifact_submitted = excluded.artifact_submitted`,
      [userId, l.id, seed.foundationComplete]
    );
  }

  // Clear any prior test passes, then seed exactly `interviewPasses` of them.
  await db.query(`delete from public.mock_interview_responses where user_id = $1`, [userId]);
  if (seed.interviewPasses > 0) {
    const scenarios = await db.query<{ id: string }>(
      `select id from public.mock_interview_scenarios where is_published = true limit $1`,
      [seed.interviewPasses]
    );
    for (const s of scenarios.rows) {
      await db.query(
        `insert into public.mock_interview_responses
           (user_id, scenario_id, response_text, status, pass)
         values ($1, $2, '__e2e_gate_test__', 'graded', true)`,
        [userId, s.id]
      );
    }
  }
}

/**
 * Remove every seeded row and the app-side user. Safe to call in afterAll.
 *
 * Order matters: deleting auth.users cascades to submissions, whose delete
 * trigger re-inserts gate_status for the (now-deleted) user → FK error. So
 * submissions and gate_status are deleted explicitly first.
 *
 * The Neon Auth account is intentionally NOT deleted: it lives in the
 * managed auth service, and ensureTestUser() reuses it (re-provisioning the
 * app rows by email) on the next run.
 */
export async function cleanup(db: Pool, userId: string): Promise<void> {
  await db.query(`delete from public.submissions where user_id = $1`, [userId]);
  await db.query(`delete from public.mock_interview_responses where user_id = $1`, [userId]);
  await db.query(`delete from public.lesson_progress where user_id = $1`, [userId]);
  await db.query(`delete from public.gate_status where user_id = $1`, [userId]);
  await db.query(`delete from public.profiles where id = $1`, [userId]).catch(() => {});
  await db.query(`delete from auth.users where id = $1`, [userId]).catch(() => {});
}

/** Log the seeded user in through the real /login form (email + password). */
export async function loginAs(page: Page): Promise<void> {
  await page.goto("/login");
  await page.locator("#email").fill(TEST_EMAIL);
  await page.locator("#password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
}
