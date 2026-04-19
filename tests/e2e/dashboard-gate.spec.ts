import { test, expect } from "@playwright/test";

// The authed branches (has_access=true vs false) need a real user session
// and are covered by manual verification on a preview deploy plus the
// integration tests against the profiles table. Here we lock down the
// unauthenticated case end-to-end — the most common regression risk.
test("unauthenticated /dashboard is always redirected to /login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard/);
});

test("landing page CTA leads into the signup funnel", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /get started/i }).click();
  await expect(page).toHaveURL(/\/signup/);
  await expect(page.getByRole("heading", { name: /create your account/i })).toBeVisible();
});
