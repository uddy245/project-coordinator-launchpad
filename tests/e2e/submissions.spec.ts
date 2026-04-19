import { test, expect } from "@playwright/test";

test("unauthenticated /submissions/:id redirects through the auth gate", async ({ page }) => {
  await page.goto("/submissions/00000000-0000-0000-0000-000000000000");
  await expect(page).toHaveURL(
    /\/login\?redirect=%2Fsubmissions%2F00000000-0000-0000-0000-000000000000/
  );
});
