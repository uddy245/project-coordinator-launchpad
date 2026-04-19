/**
 * Drive the upload flow against a local dev server using Playwright.
 * Seeds a confirmed user + has_access via service role, logs in,
 * navigates to workbook tab, uploads the sample.xlsx fixture, and
 * dumps any toast messages + server logs.
 */
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

const email = `repro-${Date.now()}@example.com`;
const password = "ReproPass123!";

console.log("creating test user", email);
const { data: created, error: userErr } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});
if (userErr) throw userErr;
const userId = created.user.id;

// Grant access so they see the lesson
await admin.from("profiles").update({ has_access: true }).eq("id", userId);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();

page.on("console", (msg) => console.log(`[page console:${msg.type()}]`, msg.text()));
page.on("pageerror", (err) => console.log("[page error]", err.message));
page.on("requestfailed", (req) =>
  console.log("[req failed]", req.method(), req.url(), req.failure()?.errorText)
);

try {
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await page.locator('input[id="email"]').fill(email);
  await page.locator('input[id="password"]').fill(password);
  await page.getByRole("button", { name: /log in/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 10_000 });
  console.log("logged in OK");

  await page.goto("http://localhost:3000/lessons/raid-logs?tab=workbook", {
    waitUntil: "networkidle",
  });
  console.log("on workbook tab");

  const fixturePath = resolve(process.cwd(), "tests/fixtures/sample.xlsx");
  const fileInput = page.locator('input[type="file"]');
  console.log("uploading", fixturePath);
  await fileInput.setInputFiles(fixturePath);

  // Wait for either navigation or toast with error
  await page.waitForTimeout(30_000);

  const url = page.url();
  console.log("final url:", url);

  const toasts = await page
    .locator('[aria-label="Notifications alt+T"]')
    .innerText()
    .catch(() => "(no toast region)");
  console.log("toasts:", toasts);
} finally {
  await browser.close();
  // Clean up the test user
  await admin.auth.admin.deleteUser(userId);
  console.log("cleaned up");
}
