import * as Sentry from "@sentry/nextjs";

export function register() {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    // Structured logs carry a correlation/request ID threaded from the edge
    // through every log line, per 62-deployment-observability.mdc — wired
    // alongside the API route handlers as they're built.
    enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  });
}
