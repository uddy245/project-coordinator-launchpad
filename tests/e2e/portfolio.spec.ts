import { test, expect } from "@playwright/test";

test("unauthenticated /portfolio redirects through the auth gate", async ({ page }) => {
  await page.goto("/portfolio");
  await expect(page).toHaveURL(/\/login\?redirect=%2Fportfolio/);
});
