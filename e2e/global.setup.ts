import { clerkSetup } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";

// Runs once before all e2e projects. Requires CLERK_SECRET_KEY /
// NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (Clerk *test* keys) as CI secrets —
// see docs/environment-setup.md. Skips cleanly with a clear message when
// they're absent (e.g. local runs without a Clerk dev instance configured)
// rather than failing the whole suite.
setup("clerk global setup", async () => {
  if (!process.env.CLERK_SECRET_KEY) {
    console.warn(
      "Skipping Clerk test-token setup: CLERK_SECRET_KEY is not set. " +
        "Authenticated e2e flows will fail until Clerk test keys are configured.",
    );
    return;
  }
  await clerkSetup();
});
