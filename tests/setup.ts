import "@testing-library/jest-dom";

// Provide stub values for env vars that `@t3-oss/env-nextjs` validates at
// module-load time. Anything that imports `@/env` (directly or transitively)
// would otherwise crash before its `vi.mock()` calls run, since module
// evaluation happens before the test body. Real values are not needed —
// individual tests mock the SDK clients (Supabase, Anthropic, Stripe, etc).
//
// Tests that need a specific env value can still override via `vi.mock("@/env", ...)`.
const TEST_ENV: Record<string, string> = {
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
  ANTHROPIC_API_KEY: "test-anthropic-key",
  STRIPE_SECRET_KEY: "sk_test_dummy",
  STRIPE_PRICE_ID: "price_test_dummy",
  GRADE_WORKER_SECRET: "test-grade-worker-secret-at-least-32-chars-long",
  NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
};

for (const [key, value] of Object.entries(TEST_ENV)) {
  // Only set if missing/empty — preserves real values when running against
  // a populated .env (e.g. integration smoke tests).
  if (!process.env[key]) {
    process.env[key] = value;
  }
}
