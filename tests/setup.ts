import "@testing-library/jest-dom";

// Provide stub values for env vars that `@t3-oss/env-nextjs` validates at
// module-load time. Anything that imports `@/env` (directly or transitively)
// would otherwise crash before its `vi.mock()` calls run, since module
// evaluation happens before the test body. Real values are not needed —
// individual tests mock the SDK clients (db, Neon Auth, Anthropic, Stripe, etc).
//
// Tests that need a specific env value can still override via `vi.mock("@/env", ...)`.
const TEST_ENV: Record<string, string> = {
  DATABASE_URL: "postgres://localhost:5432/launchpad_test_placeholder",
  NEON_AUTH_BASE_URL: "http://localhost:4000/neondb/auth",
  NEON_AUTH_COOKIE_SECRET: "test-neon-auth-cookie-secret-at-least-32-chars",
  AWS_ENDPOINT_URL_S3: "https://br-test.storage.c-1.us-east-1.aws.neon.tech",
  AWS_ACCESS_KEY_ID: "test-access-key",
  AWS_SECRET_ACCESS_KEY: "test-secret-key",
  ANTHROPIC_API_KEY: "test-anthropic-key",
  STRIPE_SECRET_KEY: "sk_test_dummy",
  STRIPE_PRICE_ID: "price_test_dummy",
  GRADE_WORKER_SECRET: "test-grade-worker-secret-at-least-32-chars-long",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
};

// Integration tests run against a LOCAL replica database
// (tests/db/build-replica.sh) when TEST_DATABASE_URL is set.
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

for (const [key, value] of Object.entries(TEST_ENV)) {
  // Only set if missing/empty — preserves real values when running against
  // a populated .env (e.g. integration smoke tests).
  if (!process.env[key]) {
    process.env[key] = value;
  }
}
