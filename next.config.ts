import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Portable container build — Cloud Run (primary) or Vercel (fallback)
  // consume the same Dockerfile/build output. See 90-project-context.mdc.
  output: "standalone",
};

export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG ?? "",
  project: process.env.SENTRY_PROJECT ?? "",
  webpack: { treeshake: { removeDebugLogging: true } },
  // Source maps are only uploaded when SENTRY_AUTH_TOKEN is present (CI/prod
  // builds); local dev builds proceed without them.
  widenClientFileUpload: false,
  telemetry: false,
});
