/**
 * RETIRED — this was a Supabase-specific repro harness.
 *
 * It seeded a pre-confirmed test user with `supabase.auth.admin.createUser`
 * (service role), flipped profiles.has_access, drove the workbook upload in
 * Playwright against localhost:3000, then deleted the user via
 * `auth.admin.deleteUser`. Auth now runs on Neon Auth (managed Better Auth),
 * which has no equivalent service-role "create confirmed user" call from a
 * script, so the harness can't be ported meaningfully.
 *
 * For upload repros, use the Playwright e2e suite (tests/e2e) with its auth
 * helpers, or sign up a user manually in the dev app and drive the flow there.
 */
console.error(
  "scripts/repro-upload.mjs is retired: it depended on Supabase Auth admin APIs " +
    "(createUser/deleteUser), which have no Neon Auth equivalent. " +
    "Use the Playwright e2e suite (tests/e2e) instead."
);
process.exit(1);
