import { test, expect } from "@playwright/test";

test("unauthenticated /profile redirects to login", async ({ page }) => {
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login\?redirect=%2Fprofile/);
});
