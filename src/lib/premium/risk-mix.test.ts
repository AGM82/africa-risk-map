import { describe, expect, it } from "vitest";
import { checkRiskMixDrift, livesByRiskTier, withWhatIfLocation } from "@/lib/premium/risk-mix";
import type { RiskCategoryCode } from "@/lib/territory/types";

describe("risk-mix drift", () => {
  const riskMap = new Map<string, RiskCategoryCode>([
    ["terr-low", "Low"],
    ["terr-high", "High"],
    ["terr-vh", "VeryHigh"],
  ]);

  it("aggregates lives by tier", () => {
    const actual = livesByRiskTier(
      [
        { territoryId: "terr-low", headcount: 85 },
        { territoryId: "terr-high", headcount: 10 },
        { territoryId: "terr-vh", headcount: 5 },
      ],
      riskMap,
    );
    expect(actual).toEqual({ lowMed: 85, high: 10, veryHigh: 5, total: 100 });
  });

  it("is inside tolerance for GRAA 85/10/5 ±2", () => {
    const result = checkRiskMixDrift(
      { lowMed: 85, high: 10, veryHigh: 5, total: 100 },
      {
        targetLowMedPct: 85,
        targetHighPct: 10,
        targetVeryHighPct: 5,
        tolerancePct: 2,
      },
    );
    expect(result.outsideTolerance).toBe(false);
  });

  it("flags when a what-if push breaches tolerance", () => {
    const locations = withWhatIfLocation(
      [
        { territoryId: "terr-low", headcount: 50 },
        { territoryId: "terr-high", headcount: 10 },
      ],
      "terr-vh",
      40,
    );
    const actual = livesByRiskTier(locations, riskMap);
    const result = checkRiskMixDrift(actual, {
      targetLowMedPct: 85,
      targetHighPct: 10,
      targetVeryHighPct: 5,
      tolerancePct: 2,
    });
    expect(result.outsideTolerance).toBe(true);
    expect(result.breachedTiers).toContain("veryHigh");
  });
});
