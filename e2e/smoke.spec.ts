import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";

test.describe("foundations smoke test", () => {
  test("unauthenticated visitor is redirected to sign-in", async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/");
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("sign-in page renders the Clerk widget", async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/sign-in");
    await expect(page.locator(".cl-signIn-root, .cl-rootBox")).toBeVisible();
  });
});
