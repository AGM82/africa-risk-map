import { Inngest } from "inngest";

/**
 * Shared Inngest client. Functions are registered incrementally as their
 * to-dos land (external-signals' feed fetches, ai-news-monitor's scan runs,
 * any future long-running import) — see src/app/api/inngest/route.ts.
 */
export const inngest = new Inngest({ id: "africa-risk-map" });
