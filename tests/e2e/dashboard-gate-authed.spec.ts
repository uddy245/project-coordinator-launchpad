import { test, expect } from "@playwright/test";
import {
  HAS_E2E_AUTH,
  testDb,
  ensureTestUser,
  seedGateState,
  cleanup,
  loginAs,
} from "./helpers/gates";

/**
 * Authed end-to-end coverage of the career-milestone gates: seed a real
 * user's gate inputs, log in, and assert the dashboard renders the right
 * badge for each gate. Complements the unauthenticated redirect check in
 * dashboard-gate.spec.ts and the computeGateSummary unit tests.
 *
 * Skips unless DATABASE_URL, NEON_AUTH_BASE_URL and E2E_TEST_PASSWORD are
 * all set (see helpers/gates).
 */
const db = HAS_E2E_AUTH ? testDb() : null;
let userId = "";

test.describe("dashboard career-milestone gates (authed)", () => {
  test.skip(
    !HAS_E2E_AUTH,
    "needs DATABASE_URL + NEON_AUTH_BASE_URL + E2E_TEST_PASSWORD to seed + log a user in"
  );

  test.beforeAll(async () => {
    userId = await ensureTestUser(db!);
  });

  test.afterAll(async () => {
    if (userId) await cleanup(db!, userId);
    await db?.end();
  });

  // Read a gate card's pip label by the card heading text.
  function pip(page: import("@playwright/test").Page, name: string) {
    return page.locator(".bg-paper", { hasText: name }).locator(".pip");
  }

  test("renders Foundations complete, Portfolio in-progress, Interview in-progress, Industry coming-soon", async ({
    page,
  }) => {
    await seedGateState(db!, userId, {
      portfolioCount: 3,
      foundationComplete: true,
      interviewPasses: 2,
    });
    await loginAs(page);

    await expect(pip(page, "Gate 1 · Foundations")).toHaveText(/complete/i);
    await expect(pip(page, "Gate 2 · Portfolio")).toHaveText(/in progress/i);
    await expect(page.locator(".bg-paper", { hasText: "Gate 2 · Portfolio" })).toContainText(
      "3 of 7"
    );
    await expect(pip(page, "Gate 3 · Mock interviews")).toHaveText(/in progress/i);
    await expect(pip(page, "Gate 4 · Industry capstone")).toHaveText(/coming soon/i);
  });

  test("flips Portfolio to complete once the artifact target is met", async ({ page }) => {
    await seedGateState(db!, userId, {
      portfolioCount: 7,
      foundationComplete: true,
      interviewPasses: 0,
    });
    await loginAs(page);

    await expect(pip(page, "Gate 2 · Portfolio")).toHaveText(/complete/i);
    await expect(page.locator(".bg-paper", { hasText: "Gate 2 · Portfolio" })).toContainText(
      "7 of 7"
    );
  });
});
