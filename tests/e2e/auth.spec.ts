import { test, expect } from "@playwright/test";

test("signup page renders form", async ({ page }) => {
  await page.goto("/signup");
  await expect(page).toHaveTitle(/Sign up/);
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByRole("button", { name: /create account/i })).toBeVisible();
});

test("login page renders form and links to signup", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveTitle(/Log in/);
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByRole("link", { name: /create an account/i })).toBeVisible();
});

test("client-side validation blocks short password", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Email").fill("user@example.com");
  await page.getByLabel("Password").fill("short");
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
});

test("landing page links to signup and login", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /get started/i })).toHaveAttribute("href", "/signup");
  await expect(page.getByRole("link", { name: /log in/i })).toHaveAttribute("href", "/login");
});
