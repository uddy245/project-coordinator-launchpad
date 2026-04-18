import { test, expect } from "@playwright/test";

test("magic link button blocks invalid email before calling server", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /send me a magic link/i }).click();
  // toast appears in the DOM via sonner
  await expect(page.getByText(/enter a valid email address first/i)).toBeVisible();
});

test("auth code error page renders when visited directly", async ({ page }) => {
  await page.goto("/auth/auth-code-error");
  await expect(page.getByRole("heading", { name: /didn.?t work|link expired/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /back to log in/i })).toBeVisible();
});

test("callback route redirects to error when no code is present", async ({ page }) => {
  await page.goto("/auth/callback");
  await expect(page).toHaveURL(/\/auth\/auth-code-error/);
});
