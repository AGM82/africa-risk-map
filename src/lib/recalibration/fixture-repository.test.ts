import { describe, expect, it, beforeEach } from "vitest";
import {
  createFixtureRecalibrationRepository,
  resetRecalibrationRepoIds,
} from "@/lib/recalibration/fixture-repository";

describe("fixture recalibration repository", () => {
  beforeEach(() => {
    resetRecalibrationRepoIds();
  });

  it("creates and locks a batch", async () => {
    const repo = createFixtureRecalibrationRepository();
    const batch = await repo.createBatch({
      clientId: "client-x",
      baselines: { ESSENTIAL: 10, PREMIUM: 2 },
    });
    expect(batch.status).toBe("IN_PROGRESS");
    const open = await repo.getOpenBatch("client-x");
    expect(open?.id).toBe(batch.id);

    const locked = await repo.lockBatch(batch.id, "user-1", new Date("2026-06-01T00:00:00.000Z"));
    expect(locked?.status).toBe("LOCKED");
    expect(await repo.getOpenBatch("client-x")).toBeNull();
  });
});
