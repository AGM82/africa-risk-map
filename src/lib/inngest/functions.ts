import type { InngestFunction } from "inngest";
import { createFixtureAdminServices } from "@/lib/admin/fixture-services";
import { inngest } from "@/lib/inngest/client";

/**
 * Daily fixture feed sync — proves Inngest wiring without outbound HTTP.
 * Replace the body with live feed parsers when those land.
 */
export const syncExternalSignalFixtures = inngest.createFunction(
  {
    id: "external-signals-sync-fixtures",
    name: "Sync fixture external signals",
    triggers: { cron: "0 6 * * *" },
  },
  async ({ step }) => {
    return step.run("sync-fixture-feeds", async () => {
      const { externalSignal } = createFixtureAdminServices();
      return externalSignal.syncFixtureFeeds();
    });
  },
);

/**
 * Registered Inngest functions, collected here so the route handler has a
 * single import.
 */
export const functions: InngestFunction.Any[] = [syncExternalSignalFixtures];
