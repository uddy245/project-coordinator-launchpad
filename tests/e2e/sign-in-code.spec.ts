import { test, expect } from "@playwright/test";

test("sign-in code button blocks invalid email before calling server", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /email me a sign-in code/i }).click();
  // toast appears in the DOM via sonner
  await expect(page.getByText(/enter a valid email address first/i)).toBeVisible();
});

test("sign-in code page without an email goes back to login", async ({ page }) => {
  await page.goto("/login/code");
  await expect(page).toHaveURL(/\/login$/);
});

test("auth code error page renders when visited directly", async ({ page }) => {
  await page.goto("/auth/auth-code-error");
  await expect(page.getByRole("heading", { name: /didn.?t work|link expired/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /back to log in/i })).toBeVisible();
});
