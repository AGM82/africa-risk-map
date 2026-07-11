import type { RecalibrationSeed } from "@/lib/recalibration/fixture-repository";

const SEED_DATE = new Date("2026-01-01T00:00:00.000Z");

/**
 * GRAA open recalibration batch with ledger PlanType baselines
 * (6,503 Essential / 14 Premium from the premium-agg ledger sample).
 * Demo org locations sum far below this — the wizard correctly shows a large delta.
 */
export const RECALIBRATION_FIXTURES: RecalibrationSeed = {
  batches: [
    {
      id: "recal-graa-open",
      clientId: "client-graa",
      status: "IN_PROGRESS",
      baselines: { ESSENTIAL: 6503, PREMIUM: 14 },
      lockedAt: null,
      lockedByUserId: null,
      createdAt: SEED_DATE,
      updatedAt: SEED_DATE,
    },
  ],
};

/** Small baselines matching ORG_LOCATION_FIXTURES endorsement totals (47 Essential / 16 Premium). */
export const BALANCED_TEST_BASELINES = {
  ESSENTIAL: 47,
  PREMIUM: 16,
} as const;
