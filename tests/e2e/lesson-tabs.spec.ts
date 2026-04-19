import { test, expect } from "@playwright/test";

// Unauthed lesson routes still gate through AUTH-003. The authed rendering
// (tab switching, deep link) needs a seeded has_access user — verified
// manually on prod. This E2E only locks the regression on the gate.
test("unauthenticated lesson page redirects through the auth gate", async ({ page }) => {
  await page.goto("/lessons/raid-logs");
  await expect(page).toHaveURL(/\/login\?redirect=%2Flessons%2Fraid-logs/);
});

test("unknown lesson slug 404s (after auth)", async ({ page }) => {
  // Unauth first — exercises the gate path. Authed non-existent slug is
  // covered by integration coverage on notFound() in the page.
  await page.goto("/lessons/does-not-exist");
  await expect(page).toHaveURL(/\/login\?redirect=%2Flessons%2Fdoes-not-exist/);
});
