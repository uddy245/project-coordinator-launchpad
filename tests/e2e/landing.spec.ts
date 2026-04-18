import { test, expect } from "@playwright/test";

test("landing page shows Launchpad heading", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Launchpad/);
  await expect(page.getByRole("heading", { name: "Launchpad" })).toBeVisible();
});
