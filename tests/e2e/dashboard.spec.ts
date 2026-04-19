import { test, expect } from "@playwright/test";

// Authed dashboard rendering is verified against production with a real
// seeded user (manual QA). At the E2E layer, the unauth gate is the
// regression risk worth locking in — the has_access=true branch already
// has integration coverage via the lessons RLS test.
test("/dashboard requires authentication", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard/);
});
